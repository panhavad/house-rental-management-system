import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { Plus, X } from "lucide-react";
import { createWorkspaceAction } from "@/app/super-admin/actions";

export default function NewWorkspacePage() {
  return (
    <div>
      <PageHeader
        title="New workspace"
        description="Creates a brand-new, fully isolated workspace and its first administrator account."
      />
      <Card className="max-w-xl">
        <CardBody>
          <form action={createWorkspaceAction} className="flex flex-col gap-4">
            <Field label="Workspace name" htmlFor="workspaceName" required>
              <Input id="workspaceName" name="workspaceName" required placeholder="Sunrise Rentals" />
            </Field>
            <Field label="Admin name" htmlFor="adminName" required>
              <Input id="adminName" name="adminName" required />
            </Field>
            <Field label="Admin email" htmlFor="adminEmail" required>
              <Input id="adminEmail" name="adminEmail" type="email" required />
            </Field>
            <Field label="Admin password" htmlFor="adminPassword" required>
              <Input id="adminPassword" name="adminPassword" type="password" minLength={8} required />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" icon={Plus}>
                Create workspace
              </Button>
              <LinkButton href="/super-admin" variant="secondary" icon={X}>
                Cancel
              </LinkButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
