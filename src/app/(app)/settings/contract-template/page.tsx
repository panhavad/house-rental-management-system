import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { FileSignature } from "lucide-react";
import { DEFAULT_CONTRACT_TEMPLATE, CONTRACT_TEMPLATE_PLACEHOLDERS } from "@/lib/contract-pdf";
import { getWorkspaceContractTemplate } from "@/lib/contract-template";
import { updateContractTemplate, resetContractTemplate, previewContractTemplate } from "@/app/(app)/settings/contract-template/actions";
import { ContractTemplateEditor } from "@/app/(app)/settings/contract-template/ContractTemplateEditor";

export default async function ContractTemplatePage() {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const customContent = await getWorkspaceContractTemplate(user.workspaceId);

  return (
    <div>
      <PageHeader
        title="Contract template"
        description="Customize the lease agreement that's automatically generated as a PDF whenever a room contract is started."
        breadcrumbs={[{ label: "Contract template" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <ContractTemplateEditor
              initialContent={customContent ?? DEFAULT_CONTRACT_TEMPLATE}
              isCustomized={customContent !== null}
              saveAction={updateContractTemplate}
              resetAction={resetContractTemplate}
              previewAction={previewContractTemplate}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-slate-500">
                <FileSignature className="h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">How the template works</p>
              </div>
              <ul className="flex flex-col gap-2 text-xs text-slate-500">
                <li>
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700"># Title</code> as the first line
                  sets the document title.
                </li>
                <li>
                  Text before the first heading is the intro paragraph shown under the title.
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">## Heading</code> starts a new
                  section — it&apos;s numbered automatically, and a section that ends up empty (e.g. Additional Notes
                  when no notes were entered) is left out entirely, renumbering the rest.
                </li>
                <li>
                  A line like <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">Label: {"{{value}}"}</code>{" "}
                  renders as a labeled field, and disappears if the value is empty.
                </li>
                <li>Any other line is normal paragraph text; a blank line starts a new paragraph.</li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="mb-3 text-sm font-medium text-slate-700">Available placeholders</p>
              <div className="flex flex-col gap-2">
                {CONTRACT_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                  <div key={placeholder.token} className="text-xs">
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-medium text-slate-700">
                      {`{{${placeholder.token}}}`}
                    </code>
                    <p className="mt-0.5 text-slate-500">{placeholder.label}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
