"""
graph.py
------------------------------------------------------------------------
LangGraph workflow for one chat turn, matching the assignment's mandatory
diagram literally (5 named stages, not folded into START/END):

    START -> receive_question -> retrieve_context -> generate_answer
          -> generate_suggested_questions -> return_response -> END

`chat_history` is passed in per-request (fetched by the Node backend from
Mongo) rather than held in memory here, so this service stays stateless and
restart-safe while still satisfying "conversation memory".

Streaming: `generate_answer` calls `llm.astream()` and invokes the
`on_chunk` callback per token, which the caller (main.py) wires straight to
a `chat:response:{requestId}` Redis publish - so tokens reach the frontend
as they're generated even though LangGraph itself runs to completion before
returning its final state.
"""
import json
import logging
import re
from typing import Awaitable, Callable, Optional, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from .llm import get_chat_model
from .usage import record_llm_call
from .vector_store import retrieve

logger = logging.getLogger("graph")


class ChatTurn(TypedDict):
    question: str
    answer: str


class ChatState(TypedDict):
    question: str
    session_id: str
    chat_history: list[ChatTurn]
    document_names: list[str]
    retrieved_docs: list
    answer: str
    sources: list[dict]
    suggested_questions: list[str]
    on_chunk: Optional[Callable[[str], Awaitable[None]]]


async def receive_question(state: ChatState) -> dict:
    question = state["question"].strip()
    if not question:
        raise ValueError("Question must not be empty")
    return {"question": question}


async def retrieve_context(state: ChatState) -> dict:
    docs = retrieve(state["question"], document_names=state.get("document_names", []))
    return {"retrieved_docs": docs}


# Plain small talk ("hi", "hey", "good morning") has no place in the vector
# index, so routing it through retrieval + the strict "only use the provided
# context" prompt produces stilted non-answers like "There's no specific
# question to answer yet." Detecting it here short-circuits both the
# retrieve/generate LLM calls entirely - cheaper, instant, and consistently
# friendly instead of depending on the model to improvise a good greeting.
GREETING_PATTERN = re.compile(
    r"^\s*(hi+|hello+|hey+|yo|sup|howdy|greetings|good\s*(morning|afternoon|evening|day))"
    r"\s*(there|everyone|all|guys|team)?[\s!.,]*$",
    re.IGNORECASE,
)
GREETING_RESPONSE = (
    "Hi there! 👋 I'm your knowledge base assistant. Ask me anything about "
    "the uploaded documents and I'll do my best to help."
)
GREETING_SUGGESTED_QUESTIONS = [
    "What documents are currently available?",
    "Summarize the key points from the knowledge base",
]


def _is_greeting(question: str) -> bool:
    return bool(GREETING_PATTERN.match(question))


ANSWER_SYSTEM_PROMPT = (
    "You are a precise knowledge-base assistant. Answer strictly from the "
    "numbered excerpts in \"Context\" below - each is labeled with its "
    "source file and page. You may combine facts across multiple excerpts "
    "and perform simple reasoning or arithmetic strictly from facts they "
    "state (e.g. estimating an approximate age from a stated graduation "
    "year), but never state a fact the excerpts don't support.\n\n"
    "If the excerpts only partially answer the question, answer the part "
    "you can and say plainly what's missing - don't guess at the rest. If "
    "two excerpts conflict, point out the conflict rather than silently "
    "picking one. If they don't cover the question at all, say the "
    "knowledge base doesn't cover it rather than improvising a plausible-"
    "sounding answer.\n\n"
    "\"Documents in the knowledge base\" (below) is the authoritative file "
    "list - use it for questions about WHICH documents exist. Never treat "
    "a name merely mentioned or referenced inside a document's content "
    "(e.g. a standard citing another standard in its bibliography) as if "
    "it were itself an uploaded file.\n\n"
    "Keep answers concise; use markdown (lists, bold) where it improves "
    "readability."
)


async def generate_answer(state: ChatState) -> dict:
    if _is_greeting(state["question"]):
        on_chunk = state.get("on_chunk")
        if on_chunk:
            await on_chunk(GREETING_RESPONSE)
        return {"answer": GREETING_RESPONSE, "sources": []}

    docs = state["retrieved_docs"]
    context = (
        "\n\n".join(
            f"[Excerpt {i + 1} - {d.metadata.get('fileName')}, page {d.metadata.get('page')}]\n{d.page_content}"
            for i, d in enumerate(docs)
        )
        or "(no relevant context found in the knowledge base)"
    )

    history_text = "\n".join(
        f"User: {turn['question']}\nAssistant: {turn['answer']}" for turn in state.get("chat_history", [])
    ) or "(no prior turns)"

    document_names = state.get("document_names", [])
    documents_text = "\n".join(f"- {name}" for name in document_names) or "(no documents uploaded yet)"

    messages = [
        SystemMessage(content=ANSWER_SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Documents currently in the knowledge base:\n{documents_text}\n\n"
                f"Conversation so far:\n{history_text}\n\n"
                f"Context from the knowledge base:\n{context}\n\n"
                f"Question: {state['question']}"
            )
        ),
    ]

    llm = get_chat_model()
    on_chunk = state.get("on_chunk")
    full_answer = ""
    await record_llm_call()
    async for chunk in llm.astream(messages):
        piece = chunk.content or ""
        if piece:
            full_answer += piece
            if on_chunk:
                await on_chunk(piece)

    sources: list[dict] = []
    seen = set()
    for d in docs:
        key = (d.metadata.get("fileName"), d.metadata.get("page"))
        if key in seen:
            continue
        seen.add(key)
        sources.append({"documentName": d.metadata.get("fileName"), "page": d.metadata.get("page")})

    return {"answer": full_answer, "sources": sources}


class SuggestedQuestions(BaseModel):
    questions: list[str] = Field(description="3 to 5 short, relevant follow-up questions")


SUGGEST_SYSTEM_PROMPT = (
    "Given the user's question and the assistant's answer, propose 3 to 5 "
    "short follow-up questions that dig deeper into the SAME topic using "
    "the knowledge base - not generic small talk. Prefer questions that: "
    "ask for specifics the answer only touched on briefly, request a "
    "comparison or example, or move to a closely related section of the "
    "same document(s). Avoid yes/no questions and avoid repeating the "
    "original question's phrasing. Every question must be answerable from "
    "documents in this knowledge base."
)


def _parse_questions_fallback(text: str) -> list[str]:
    """Tolerant parser used when a provider/model doesn't support structured output reliably."""
    cleaned = re.sub(r"```(json)?", "", text).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            return [str(q).strip() for q in parsed if str(q).strip()]
        except json.JSONDecodeError:
            pass
    lines = [re.sub(r"^[\d.\-)\s]+", "", line).strip() for line in cleaned.splitlines()]
    # Models often preface the list with a plain sentence like "Here are 3-5
    # follow-up questions:" before the real items - that line has no leading
    # list marker for the regex above to strip, so without this filter it
    # gets returned as if it were question #1. Real follow-up questions are
    # always phrased as questions, so requiring "?" reliably drops it.
    return [line for line in lines if line and line.endswith("?")][:5]


async def generate_suggested_questions(state: ChatState) -> dict:
    if _is_greeting(state["question"]):
        return {"suggested_questions": GREETING_SUGGESTED_QUESTIONS}

    llm = get_chat_model()
    prompt = (
        f"Question: {state['question']}\nAnswer: {state['answer']}\n\n"
        "Return 3-5 short follow-up questions."
    )
    messages = [SystemMessage(content=SUGGEST_SYSTEM_PROMPT), HumanMessage(content=prompt)]

    try:
        structured_llm = llm.with_structured_output(SuggestedQuestions)
        await record_llm_call()
        result = await structured_llm.ainvoke(messages)
        # Same preamble-leak risk as the text fallback below - a model can
        # still stuff a non-question intro line into the structured list.
        questions = [q for q in result.questions if q.strip().endswith("?")]
    except Exception:
        logger.warning("Structured output unavailable for suggested questions, falling back to text parsing")
        try:
            await record_llm_call()
            raw = await llm.ainvoke(messages)
            questions = _parse_questions_fallback(raw.content)
        except Exception:
            logger.exception("Failed to generate suggested questions")
            questions = []

    return {"suggested_questions": questions[:5]}


async def return_response(state: ChatState) -> dict:
    # Assembly point - state is already complete. Kept as an explicit node
    # (rather than wiring generate_suggested_questions straight to END) so
    # the graph shape matches the assignment's mandatory diagram literally.
    # LangGraph requires every node to write at least one state key, so this
    # is a harmless no-op rewrite rather than a real update.
    return {"answer": state["answer"]}


def build_chat_graph():
    graph = StateGraph(ChatState)
    graph.add_node("receive_question", receive_question)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_answer", generate_answer)
    graph.add_node("generate_suggested_questions", generate_suggested_questions)
    graph.add_node("return_response", return_response)

    graph.add_edge(START, "receive_question")
    graph.add_edge("receive_question", "retrieve_context")
    graph.add_edge("retrieve_context", "generate_answer")
    graph.add_edge("generate_answer", "generate_suggested_questions")
    graph.add_edge("generate_suggested_questions", "return_response")
    graph.add_edge("return_response", END)

    return graph.compile()


_chat_graph = None


def get_chat_graph():
    global _chat_graph
    if _chat_graph is None:
        _chat_graph = build_chat_graph()
    return _chat_graph


async def run_chat(
    question: str,
    session_id: str,
    chat_history: list[ChatTurn],
    document_names: list[str],
    on_chunk: Callable[[str], Awaitable[None]],
) -> dict:
    graph = get_chat_graph()
    initial_state: ChatState = {
        "question": question,
        "session_id": session_id,
        "chat_history": chat_history,
        "document_names": document_names,
        "retrieved_docs": [],
        "answer": "",
        "sources": [],
        "suggested_questions": [],
        "on_chunk": on_chunk,
    }
    final_state = await graph.ainvoke(initial_state)
    return {"sources": final_state["sources"], "suggestedQuestions": final_state["suggested_questions"]}
