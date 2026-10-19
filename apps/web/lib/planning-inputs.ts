export function planningMinor(value: string): number {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value.trim()))
    throw new Error("Enter an amount with up to two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 100000000000000)
    throw new Error("This amount is too large.");
  return amount;
}
export function moveAllocation<
  T extends {
    id: string;
    allocatedMinor: number;
    spentMinor?: number;
    kind?: string;
  },
>(categories: T[], from: string, to: string, amount: number): T[] {
  if (
    from === to ||
    !categories.some((c) => c.id === from) ||
    !categories.some((c) => c.id === to)
  )
    throw new Error("Choose two different categories.");
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    Math.max(
      0,
      categories.find((c) => c.id === from)!.allocatedMinor -
        (categories.find((c) => c.id === from)!.kind === "SAVINGS"
          ? 0
          : (categories.find((c) => c.id === from)!.spentMinor ?? 0)),
    ) < amount
  )
    throw new Error(
      "The source category does not have that allocation available.",
    );
  return categories.map((c) => ({
    ...c,
    allocatedMinor:
      c.allocatedMinor + (c.id === from ? -amount : c.id === to ? amount : 0),
  }));
}
