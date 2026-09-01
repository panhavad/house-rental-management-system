"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn, Loader2, Mail, Lock, Building2 } from "lucide-react";
import { loginAction, LoginState } from "@/app/login/actions";
import { Field, Input } from "@/components/ui/Field";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <Field
        label="Workspace"
        htmlFor="workspace"
        icon={Building2}
        hint="Leave blank only if you're signing in as the Super Admin."
      >
        <Input id="workspace" name="workspace" type="text" autoComplete="organization" placeholder="your-company" />
      </Field>
      <Field label="Email" htmlFor="email" required icon={Mail}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" required icon={Lock}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
