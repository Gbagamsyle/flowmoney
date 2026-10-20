import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LegalLinks } from "./legal-links";
import {
  LEGAL_STATUS,
  LEGAL_VERSION,
  type LegalContent,
} from "@/lib/legal-content";
export function LegalDocument({ document }: { document: LegalContent }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 border-b px-6 py-6">
        <Link href="/" aria-label="FlowMoney home">
          <BrandMark />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm underline underline-offset-4"
        >
          Open FlowMoney
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-sm text-muted-foreground">
          {LEGAL_STATUS} · Version {LEGAL_VERSION} · 20 October 2026
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {document.introduction}
        </p>
        <p role="note" className="mt-6 rounded-lg border p-4 text-sm leading-6">
          Prepared for private alpha. The final effective date, production
          providers, retention periods and privacy review must be confirmed
          before launch.
        </p>
        <nav aria-label="On this page" className="my-8 border-y py-5">
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {document.sections.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#section-${i + 1}`}
                  className="underline underline-offset-4"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="space-y-9">
          {document.sections.map((s, i) => (
            <section
              id={`section-${i + 1}`}
              key={s.title}
              className="scroll-mt-6"
            >
              <h2 className="text-xl font-semibold tracking-tight">
                {s.title}
              </h2>
              <div className="mt-3 space-y-3">
                {s.paragraphs.map((p) => (
                  <p
                    key={p}
                    className="text-sm leading-7 text-muted-foreground"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm">
          Privacy requests:{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:ogabasyle@gmail.com"
          >
            ogabasyle@gmail.com
          </a>
          . You may also contact the{" "}
          <a
            className="underline underline-offset-4"
            href="https://ndpc.gov.ng/"
          >
            Nigeria Data Protection Commission
          </a>
          .
        </p>
      </main>
      <footer className="mx-auto max-w-5xl border-t px-6 py-8">
        <LegalLinks />
      </footer>
    </div>
  );
}
