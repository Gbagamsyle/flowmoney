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
      className={cn("shadow-none", emphasis && "border-primary/30 bg-primary/[0.04]")}
    >
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </CardHeader>

      <CardContent>
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight",
            emphasis && "text-primary",
          )}
        >
          {value}
        </p>

        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
