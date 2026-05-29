import { notFound } from "next/navigation";

// All unbuilt sub-routes return the admin not-found page (Phase 2+)
export default function AdminSubPage() {
  notFound();
}
