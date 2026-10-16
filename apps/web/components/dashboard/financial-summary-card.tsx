import { Card, CardContent, CardHeader } from "@flowmoney/ui/components/card";
import { cn } from "@flowmoney/ui/lib/utils";

type FinancialSummaryCardProps = {
  label: string;
  value: string;
  description: string;
  emphasis?: boolean;
};

export function FinancialSummaryCard({
  label,
  value,
  description,
  emphasis,
}: FinancialSummaryCardProps) {
  return (
    <Card
      className={cn("min-w-0 shadow-none [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]", emphasis && "bg-primary text-primary-foreground [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]")}
    >
      <CardHeader className="pb-2">
        <p className={cn("text-sm font-medium text-muted-foreground", emphasis && "text-primary-foreground/80")}>{label}</p>
      </CardHeader>

      <CardContent>
        <p
          className={cn(
            "break-all text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
            emphasis && "text-4xl leading-tight sm:text-5xl lg:text-6xl",
          )}
        >
          {value}
        </p>

        <p className={cn("mt-3 max-w-xl text-sm leading-6 text-muted-foreground", emphasis && "text-primary-foreground/80")}>{description}</p>
      </CardContent>
    </Card>
  );
}
