import { expect, test } from "@playwright/test";
import { planningMinor, moveAllocation } from "../lib/planning-inputs";
test("planning money input preserves cents and rejects invalid amounts", () => {
  expect(planningMinor("125.05")).toBe(12505);
  expect(planningMinor("0.1")).toBe(10);
  for (const value of ["", "-1", "1e3", "1.005", "abc", "9999999999999999"])
    expect(() => planningMinor(value)).toThrow();
});
test("moving allocations preserves totals, category identity and source data", () => {
  const original = [
    { id: "a", allocatedMinor: 5000 },
    { id: "b", allocatedMinor: 1000 },
  ];
  const result = moveAllocation(original, "a", "b", 1250);
  expect(result).toEqual([
    { id: "a", allocatedMinor: 3750 },
    { id: "b", allocatedMinor: 2250 },
  ]);
  expect(original[0].allocatedMinor).toBe(5000);
  expect(() => moveAllocation(original, "a", "b", 5001)).toThrow();
  expect(() => moveAllocation(original, "a", "a", 1)).toThrow();
  expect(() => moveAllocation(original, "missing", "b", 1)).toThrow();
});

test("allocation moves do not reuse money already spent", () => {
  expect(() =>
    moveAllocation(
      [
        { id: "a", allocatedMinor: 1000, spentMinor: 800 },
        { id: "b", allocatedMinor: 0, spentMinor: 0 },
      ],
      "a",
      "b",
      201,
    ),
  ).toThrow();
});
