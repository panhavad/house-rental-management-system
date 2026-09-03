import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** Shown while a super-admin page is still loading its data — the header renders immediately. */
export default function SuperAdminLoading() {
  return <PageSkeleton />;
}
