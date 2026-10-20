import Link from "next/link";
export function LegalLinks() {
  return (
    <nav
      aria-label="Legal information"
      className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground"
    >
      <Link
        className="underline-offset-4 hover:text-foreground hover:underline"
        href="/privacy"
      >
        Privacy
      </Link>
      <Link
        className="underline-offset-4 hover:text-foreground hover:underline"
        href="/terms"
      >
        Terms
      </Link>
      <Link
        className="underline-offset-4 hover:text-foreground hover:underline"
        href="/financial-disclaimer"
      >
        Financial disclaimer
      </Link>
      <Link
        className="underline-offset-4 hover:text-foreground hover:underline"
        href="/data-retention"
      >
        Data retention
      </Link>
    </nav>
  );
}
