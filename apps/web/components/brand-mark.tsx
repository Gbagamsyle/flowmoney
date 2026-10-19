import Image from "next/image";

import { cn } from "@flowmoney/ui/lib/utils";

type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

export function BrandMark({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent",
          iconClassName,
        )}
      >
        <Image
          src="/flowmoney-icon_1.png"
          alt="FlowMoney logo"
          width={72}
          height={72}
          priority
          className="block h-full w-full object-contain dark:hidden"
        />
        <Image
          src="/flowmoney-icon-dark.png"
          alt="FlowMoney logo"
          width={72}
          height={72}
          priority
          className="hidden h-full w-full object-contain dark:block"
        />
      </div>
      {showText ? (
        <span
          className={cn("text-base font-medium tracking-tight text-foreground", textClassName)}
        >
          FlowMoney
        </span>
      ) : null}
    </div>
  );
}
