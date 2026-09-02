import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";
import { isSelfSignupEnabled } from "@/lib/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">RentalHRM</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your rental properties</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
        {isSelfSignupEnabled() ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{" "}
            <Link href="/signup" className="font-medium text-slate-900 hover:underline">
              Create your workspace
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
