import { ReactNode } from "react";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { TranslatedText } from "@/components/LanguageProvider";

/**
 * Translates its own title/description so every page picks up the active
 * language without each page reaching for the translator. Headings built from
 * live data (a room name, "Edit <name>") have no catalog entry and fall through
 * unchanged.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            <TranslatedText>{title}</TranslatedText>
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">
              <TranslatedText>{description}</TranslatedText>
            </p>
          ) : null}
        </div>
        {actions ? (
          // Wraps instead of overflowing once a page has enough actions to
          // exceed a phone's width (e.g. Utilities' export/scan/record trio).
          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
