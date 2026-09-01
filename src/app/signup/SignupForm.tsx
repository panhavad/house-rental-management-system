"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Rocket, Loader2, Mail, Lock, Building2, User } from "lucide-react";
import { signupAction, SignupState } from "@/app/signup/actions";
import { Field, Input } from "@/components/ui/Field";

const initialState: SignupState = {};

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
        <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {pending ? "Creating your workspace…" : "Create my workspace"}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Workspace name" htmlFor="workspaceName" required icon={Building2}>
        <Input id="workspaceName" name="workspaceName" required placeholder="Sunrise Rentals" />
      </Field>
      <Field label="Your name" htmlFor="adminName" required icon={User}>
        <Input id="adminName" name="adminName" required />
      </Field>
      <Field label="Email" htmlFor="adminEmail" required icon={Mail}>
        <Input id="adminEmail" name="adminEmail" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" required icon={Lock}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" required icon={Lock}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
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
