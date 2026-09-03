import { PageSkeleton } from "@/components/ui/PageSkeleton";

/**
 * Shown immediately while any page within the authenticated app shell is
 * still loading its data — the header/nav in `(app)/layout.tsx` render right
 * away (they're outside this boundary), so only the page content area shows
 * this placeholder instead of the whole app feeling frozen.
 */
export default function AppLoading() {
  return <PageSkeleton />;
}
