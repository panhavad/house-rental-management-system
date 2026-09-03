import { Download, Languages } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RestoreButton } from "@/components/ui/RestoreButton";
import { prisma } from "@/lib/prisma";
import { DEFAULT_KHMER_TRANSLATIONS } from "@/lib/language-catalog";
import { parseTranslations } from "@/lib/language";
import { LanguagePackEditor } from "@/app/super-admin/languages/LanguagePackEditor";
import { restoreKhmerLanguagePackAction } from "@/app/super-admin/languages/actions";

export default async function LanguagesPage() {
  const pack = await prisma.languagePack.findUnique({ where: { code: "km" } });
  const translations = pack
    ? { ...DEFAULT_KHMER_TRANSLATIONS, ...parseTranslations(pack.translations) }
    : DEFAULT_KHMER_TRANSLATIONS;

  return (
    <div>
      <PageHeader
        title="Languages"
        description="Modify every registered system phrase used by the interface and generated PDFs."
        actions={
          <>
            <LinkButton href="/api/languages/export" variant="secondary" icon={Download}>
              Backup language pack
            </LinkButton>
            <RestoreButton
              action={restoreKhmerLanguagePackAction}
              label="Restore language pack"
              confirmMessage={'Restore Khmer translations from "{filename}"? Current translations will be replaced.'}
            />
          </>
        }
      />
      <div className="mb-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Languages className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Khmer is Unicode-enabled throughout the application. Invoice and contract PDFs embed a Khmer font so
          translated text remains readable when downloaded, shared, or printed on another device.
        </p>
      </div>
      <LanguagePackEditor translations={translations} />
    </div>
  );
}
