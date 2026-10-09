import Image from "next/image";

export function FlowMoneyLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/flowmoney-logo.png"
      alt=""
      width={2170}
      height={725}
      className={className}
    />
  );
}