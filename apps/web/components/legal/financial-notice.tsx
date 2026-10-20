import Link from "next/link";
export function FinancialNotice() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      Estimates for planning, not financial advice. Expected income is not
      guaranteed.{" "}
      <Link
        href="/financial-disclaimer"
        className="underline underline-offset-4"
      >
        Read the financial disclaimer
      </Link>
      .
    </p>
  );
}
