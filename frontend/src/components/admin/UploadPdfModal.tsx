'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

export function UploadPdfModal({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post('/admin/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>
            The document is automatically extracted, chunked, embedded, and added to the knowledge base.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-input hover:bg-slate-50',
            isUploading && 'pointer-events-none opacity-60',
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{isUploading ? 'Uploading…' : 'Drag & drop a PDF, or click to browse'}</p>
          <p className="text-xs text-muted-foreground">Max 20MB, PDF only</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </div>

        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          Choose file
        </Button>
      </DialogContent>
    </Dialog>
  );
}
