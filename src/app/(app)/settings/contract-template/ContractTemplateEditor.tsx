"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Save, RotateCcw, Eye, X, AlertTriangle, PencilLine } from "lucide-react";

type PreviewResult = { pdfBase64: string } | { error: string };

export function ContractTemplateEditor({
  initialContent,
  isCustomized,
  saveAction,
  resetAction,
  previewAction,
}: {
  initialContent: string;
  isCustomized: boolean;
  saveAction: (formData: FormData) => void;
  resetAction: () => void;
  previewAction: (formData: FormData) => Promise<PreviewResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, startPreviewTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePreview() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setPreviewError(null);
    startPreviewTransition(async () => {
      const result = await previewAction(formData);
      if ("error" in result) {
        setPreviewError(result.error);
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    });
  }

  function closePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function handleReset() {
    if (!confirm("Reset to the built-in default template? Your customizations will be lost.")) return;
    startResetTransition(async () => {
      await resetAction();
    });
  }

  return (
    <form ref={formRef} key={initialContent} action={saveAction} className="flex flex-col gap-3">
      <Textarea
        name="content"
        defaultValue={initialContent}
        rows={26}
        spellCheck={false}
        className="font-mono text-xs leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" icon={Save}>
          Save template
        </Button>
        <Button type="button" variant="secondary" icon={Eye} disabled={isPreviewing} onClick={handlePreview}>
          {isPreviewing ? "Preparing preview…" : "Preview with sample data"}
        </Button>
        {isCustomized ? (
          <Button type="button" variant="secondary" icon={RotateCcw} disabled={isResetting} onClick={handleReset}>
            {isResetting ? "Resetting…" : "Reset to default"}
          </Button>
        ) : null}
      </div>

      {previewError ? (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {previewError}
        </p>
      ) : null}

      {previewUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <PencilLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Rendered with sample data — save the template to apply it to real contracts.
            </p>
            <button
              type="button"
              onClick={closePreview}
              className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <iframe
            src={previewUrl}
            title="Contract template preview"
            className="h-[70vh] w-full rounded-md border border-amber-200 bg-white"
          />
        </div>
      ) : null}
    </form>
  );
}
