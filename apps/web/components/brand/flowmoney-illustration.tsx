import Image from "next/image";

export function FlowMoneyIllustration() {
  return (
    <Image
      src="/images/flowmoney-hero.png"
      alt="Three planning panels connected by a flowing line: Plan today, Cover what's coming, and Stay prepared."
      width={1672}
      height={941}
      priority
      className="block h-auto w-full object-contain"
    />
  );
}