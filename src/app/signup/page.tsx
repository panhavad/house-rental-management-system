import { redirect } from "next/navigation";
import Link from "next/link";
import { SignupForm } from "@/app/signup/SignupForm";
import { isSelfSignupEnabled } from "@/lib/config";

// Without this, Next.js prerenders the page once at build time and freezes the
// isSelfSignupEnabled() check against the build-time environment — so a
// deployment's real ALLOW_SELF_SIGNUP value (only known at container runtime)
// would never actually take effect. Forcing dynamic rendering makes it
// re-evaluate on every request instead.
export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (!isSelfSignupEnabled()) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Create your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your own isolated RentalHRM system in a minute — you&apos;ll be its administrator.
          </p>
        </div>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have a workspace?{" "}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
