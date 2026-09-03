"use client";

import { useState, useTransition } from "react";
import { FileText, ExternalLink, X, Loader2 } from "lucide-react";

export type ContractDocumentItem = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  fileType: string;
};

export function ContractDocumentGrid({
  documents,
  onDelete,
}: {
  documents: ContractDocumentItem[];
  onDelete?: (documentId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  function handleRemove(documentId: string) {
    if (!onDelete || !confirm("Remove this document?")) return;
    setRemovingId(documentId);
    startTransition(() => {
      onDelete(documentId);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <div key={doc.id} className="group relative h-16 w-16 shrink-0">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 hover:border-slate-300"
          >
            {doc.fileType === "image" && doc.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- intentionally small/low-quality thumbnail, not an optimizable asset
              <img src={doc.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <FileText className="h-6 w-6 text-slate-400" aria-hidden="true" />
            )}
          </a>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          {onDelete ? (
            <button
              type="button"
              title="Remove"
              disabled={isPending && removingId === doc.id}
              onClick={() => handleRemove(doc.id)}
              className={`absolute -right-1.5 -top-1.5 rounded-full bg-red-600 p-0.5 text-white shadow-sm transition-opacity group-hover:opacity-100 ${
                isPending && removingId === doc.id ? "opacity-100" : "opacity-0"
              }`}
            >
              {isPending && removingId === doc.id ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
