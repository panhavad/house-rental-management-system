import Link from "next/link";
import { SignupForm } from "@/app/signup/SignupForm";

export default function SignupPage() {
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
