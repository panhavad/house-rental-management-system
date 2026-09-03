import { LoginForm } from "@/app/login/LoginForm";
import { StatusLink } from "@/components/ui/StatusLink";
import { isSelfSignupEnabled } from "@/lib/config";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { getTranslator } from "@/lib/language";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const t = await getTranslator();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">RentalHRM</h1>
          <p className="mt-1 text-sm text-slate-500">{t("Sign in to manage your rental properties")}</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
        {isSelfSignupEnabled() ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{" "}
            <StatusLink
              href="/signup"
              className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
              spinnerClassName="h-3.5 w-3.5"
            >
              Create your workspace
            </StatusLink>
          </p>
        ) : null}
      </div>
    </div>
  );
}
