"use client";

import { Wrench, Power, MessageSquare, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import {
  enableMaintenanceModeAction,
  disableMaintenanceModeAction,
} from "@/app/super-admin/maintenance-actions";

/**
 * The Super Admin's maintenance-mode switch.
 *
 * A Client Component purely so turning maintenance *on* can ask for confirmation
 * first — it locks every other user out of the platform, which is not something
 * to trigger with a stray click.
 */
export function MaintenanceCard({
  enabled,
  message,
  startedAtLabel,
}: {
  enabled: boolean;
  message: string | null;
  /** Pre-formatted on the server, like every other timestamp in this app. */
  startedAtLabel: string | null;
}) {
  return (
    <Card className={enabled ? "mb-6 border-amber-300 bg-amber-50/40" : "mb-6"}>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <Wrench
                className={`h-4 w-4 shrink-0 ${enabled ? "text-amber-600" : "text-slate-400"}`}
                aria-hidden="true"
              />
              Maintenance mode
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Locks every workspace user out of the app — they see a &ldquo;system is being
              updated&rdquo; page instead — while you run an update, a migration or a restore. You
              keep full access the whole time, and the notice keeps being served even while the app
              container itself is stopped.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              enabled ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-amber-600" : "bg-slate-400"}`}
              aria-hidden="true"
            />
            {enabled ? "Active" : "Off"}
          </span>
        </div>

        {enabled && startedAtLabel ? (
          <p className="mt-3 text-sm text-amber-800">
            Users have been locked out since {startedAtLabel}.
          </p>
        ) : null}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <form
            action={enableMaintenanceModeAction}
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              if (
                !enabled &&
                !confirm(
                  "Turn on maintenance mode? Everyone except you will immediately be locked out of the app until you turn it off."
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <Field
              label="Message shown to locked-out users (optional)"
              htmlFor="maintenance-message"
              icon={MessageSquare}
              hint="Leave empty to show only the default “we'll be back shortly” notice."
            >
              <Textarea
                id="maintenance-message"
                name="message"
                rows={2}
                maxLength={500}
                defaultValue={message ?? ""}
                placeholder="Back around 9pm — upgrading to the new version."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant={enabled ? "secondary" : "danger"} icon={enabled ? Save : Power}>
                {enabled ? "Update message" : "Turn on maintenance mode"}
              </Button>
            </div>
          </form>

          {enabled ? (
            <form action={disableMaintenanceModeAction} className="mt-3">
              <Button type="submit" icon={Power}>
                Turn off maintenance mode
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
