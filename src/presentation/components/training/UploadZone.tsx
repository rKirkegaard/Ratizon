import { useState, useRef, useCallback } from "react";

interface UploadZoneProps {
  athleteId: string;
  onUploadComplete: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

const ACCEPTED_EXTENSIONS = [".fit", ".tcx", ".zip"];
const ACCEPTED_MIME = [
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "text/xml",
  "application/xml",
];

export default function UploadZone({
  athleteId,
  onUploadComplete,
}: UploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function isValidFile(file: File): boolean {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    return ACCEPTED_EXTENSIONS.includes(ext);
  }

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isValidFile(file)) {
        setError(`Ugyldig filtype: ${file.name}. Kun FIT, TCX og ZIP filer er tilladt.`);
        setStatus("error");
        return;
      }

      setStatus("uploading");
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload fejlede: ${xhr.status} ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error("Netvaerksfejl under upload"));
          xhr.open("POST", `/api/training/upload/${athleteId}`);
          try {
            const stored = localStorage.getItem("ratizon-auth");
            if (stored) {
              const parsed = JSON.parse(stored);
              const token = parsed?.state?.accessToken;
              if (token) {
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
              }
            }
          } catch {
            // ignore parse errors
          }
          xhr.send(formData);
        });

        setStatus("success");
        setProgress(100);
        onUploadComplete();

        // Reset after 3 seconds
        setTimeout(() => {
          setStatus("idle");
          setProgress(0);
        }, 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ukendt fejl ved upload";
        setError(message);
        setStatus("error");
      }
    },
    [athleteId, onUploadComplete]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  return (
    <div data-testid="upload-zone">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : status === "success"
              ? "border-green-500 bg-green-500/5"
              : status === "error"
                ? "border-destructive bg-destructive/5"
                : "border-border hover:border-muted-foreground hover:bg-muted/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".fit,.tcx,.zip"
          onChange={handleFileSelect}
          className="sr-only"
        />

        {status === "idle" && (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-medium text-foreground">
              Traek og slip FIT/TCX/ZIP filer her
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              eller klik for at vaelge filer
            </p>
          </>
        )}

        {status === "uploading" && (
          <>
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm font-medium text-foreground">
              Uploader... {progress}%
            </p>
            <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 text-green-500"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm font-medium text-green-400">
              Upload gennemfoert!
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">Klik for at proeve igen</p>
          </>
        )}
      </div>
    </div>
  );
}
