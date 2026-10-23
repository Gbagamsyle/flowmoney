import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@flowmoney/ui/components/card";
import { cn } from "@flowmoney/ui/lib/utils";

type FinancialSummaryCardProps = {
  label: string;
  value: string;
  description: string;
  emphasis?: boolean;
  icon?: LucideIcon;
};

export function FinancialSummaryCard({
  label,
  value,
  description,
  emphasis,
  icon: Icon,
}: FinancialSummaryCardProps) {
  return (
    <Card
      className={cn(
        "min-w-0 h-full gap-4 rounded-xl border border-border bg-card text-card-foreground shadow-none ring-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(7)]",
        emphasis &&
          "gap-2 border-foreground/20 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]",
      )}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              aria-hidden="true"
              className="size-8 shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary-ink"
            />
          )}
          <p
            className={cn(
              "text-sm font-medium text-muted-foreground",
              emphasis && "text-foreground",
            )}
          >
            {label}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p
          className={cn(
            "break-all text-2xl font-semibold leading-tight tracking-tight tabular-nums sm:text-3xl",
            emphasis && "text-3xl sm:text-4xl",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-4 max-w-xl text-[13px] leading-6 text-muted-foreground",
            emphasis && "mt-2 max-w-none text-muted-foreground",
          )}
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
