"use client";

import { useRef, useState } from "react";
import { FolderOpen, Upload, Loader2, X } from "lucide-react";

export type RestoreState = { error?: string; success?: string };

/**
 * A single restore button with a two-step flow:
 * 1. First click opens the native file picker.
 * 2. Once a file is chosen, the button's label changes to show the file name
 *    (and its style changes to signal it's "armed").
 * 3. Clicking it again confirms (a native `confirm()`, since this always
 *    overwrites current data) and runs the restore, reporting the result
 *    inline.
 */
export function RestoreButton({
  action,
  confirmMessage,
  label = "Restore backup",
}: {
  action: (formData: FormData) => Promise<RestoreState>;
  /** Confirmation text shown before restoring. Use "{filename}" as a placeholder for the chosen file's name. */
  confirmMessage: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RestoreState | null>(null);

  function handleButtonClick() {
    if (!file) {
      setResult(null);
      inputRef.current?.click();
      return;
    }

    const message = confirmMessage.replaceAll("{filename}", file.name);
    if (!confirm(message)) return;

    setPending(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    action(formData)
      .then((state) => setResult(state))
      .finally(() => {
        setPending(false);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      });
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setResult(null);
        }}
      />
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={pending}
          title={file ? `Click again to restore from "${file.name}"` : undefined}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            file
              ? "bg-amber-500 text-white hover:bg-amber-400"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : file ? (
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {pending ? "Restoring…" : file ? `Restore "${file.name}"` : label}
        </button>
        {file && !pending ? (
          <button
            type="button"
            onClick={clearFile}
            aria-label="Cancel file selection"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {result?.error ? (
        <p role="alert" className="max-w-sm text-xs text-red-700">
          {result.error}
        </p>
      ) : null}
      {result?.success ? (
        <p role="status" className="max-w-sm text-xs text-green-700">
          {result.success}
        </p>
      ) : null}
    </div>
  );
}
