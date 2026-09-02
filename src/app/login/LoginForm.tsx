"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn, Loader2, Mail, Lock, Building2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { loginAction } from "@/app/login/actions";
import { LoginState, SUPER_ADMIN_SELECTION } from "@/app/login/login-types";
import { Field, Input } from "@/components/ui/Field";
import { ROLE_LABELS } from "@/lib/rbac";

const initialState: LoginState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
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
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [selection, setSelection] = useState<string | null>(null);

  if (state.candidates && state.candidates.length > 0) {
    const selectedWorkspace =
      selection && selection !== SUPER_ADMIN_SELECTION
        ? state.candidates.find((c) => c.kind === "workspace" && c.workspaceSlug === selection)
        : undefined;

    return (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={state.email ?? ""} />
        <input type="hidden" name="password" value={state.password ?? ""} />
        <input type="hidden" name="callbackUrl" value={state.callbackUrl ?? callbackUrl ?? ""} />
        {selectedWorkspace && selectedWorkspace.kind === "workspace" ? (
          <input type="hidden" name="selectionWorkspaceId" value={selectedWorkspace.workspaceId} />
        ) : null}

        <p className="text-sm text-slate-600">This email is used in more than one place. Continue as:</p>

        <div className="flex flex-col gap-2">
          {state.candidates.map((candidate) => {
            const value = candidate.kind === "super-admin" ? SUPER_ADMIN_SELECTION : candidate.workspaceSlug;
            const isSelected = selection === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                  isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="selection"
                  value={value}
                  checked={isSelected}
                  onChange={() => setSelection(value)}
                  required
                  className="h-4 w-4 shrink-0 border-slate-300"
                />
                {candidate.kind === "super-admin" ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                )}
                <span className="flex-1">
                  <span className="block font-medium text-slate-900">
                    {candidate.kind === "super-admin" ? "Platform Super Admin" : candidate.label}
                  </span>
                  {candidate.kind === "workspace" ? (
                    <span className="block text-xs text-slate-400">{ROLE_LABELS[candidate.role as Role]}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>

        {selectedWorkspace ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="setDefault" className="rounded border-slate-300" />
            Remember this as my default workspace
          </label>
        ) : null}

        {state.error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <SubmitButton label="Continue" pendingLabel="Signing in…" />

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Use a different account
        </Link>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
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
      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
