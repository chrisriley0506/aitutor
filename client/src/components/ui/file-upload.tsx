import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";

type FileUploadProps = {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
};

export function FileUpload({ 
  onUpload,
  accept = ".pdf,.doc,.docx,.txt",
  maxSize = 5 * 1024 * 1024 // 5MB
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > maxSize) {
      alert(`File size should be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );

    if (!acceptedTypes.includes(fileType || '')) {
      alert(`Only ${accept} files are accepted`);
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 100);

      await onUpload(file);
      setProgress(100);
      setTimeout(() => {
        setFile(null);
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6
          ${dragActive ? 'border-primary' : 'border-border'}
          ${file ? 'bg-secondary/50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {!file ? (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop your file here, or{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: {accept}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploading && (
              <Progress value={progress} className="h-2" />
            )}

            {!uploading && (
              <Button 
                className="w-full" 
                onClick={handleUpload}
              >
                Upload File
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
