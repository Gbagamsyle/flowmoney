import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalDocuments } from "@/lib/legal-content";
const document = legalDocuments["financial-disclaimer"];
export const metadata: Metadata = { title: document.title, robots: { index: false, follow: true } };
export default function Page() { return <LegalDocument document={document} />; }
