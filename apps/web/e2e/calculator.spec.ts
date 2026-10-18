import { expect, test } from "@playwright/test";
import { calculate } from "../lib/calculator";
test("exact decimal arithmetic and operator precedence", () => {
  expect(calculate("0.1 + 0.2")).toBe("0.3");
  expect(calculate("20 − 3 × 4")).toBe("8");
  expect(calculate("(20 - 3) * 4")).toBe("68");
  expect(calculate("30000 ÷ 4")).toBe("7500");
});
test("percentages, discounts and negative amounts", () => {
  expect(calculate("20000 × 15%")).toBe("3000");
  expect(calculate("20000 * (1 - 10%)")).toBe("18000");
  expect(calculate("-5 * -2.5")).toBe("12.5");
  expect(calculate("-(2+3)")).toBe("-5");
  expect(calculate(".5 + .25")).toBe("0.75");
});
test("rounds only at display and avoids negative zero", () => {
  expect(calculate("1 / 3")).toBe("0.333333333333");
  expect(calculate("1 / 3 * 3")).toBe("1");
  expect(calculate("2 / 3")).toBe("0.666666666667");
  expect(calculate("-0 / 2")).toBe("0");
});
test("invalid, incomplete, unsafe and unbounded expressions fail safely", () => {
  for (const expression of [
    "",
    "1 / 0",
    "1/(2-2)",
    "2+",
    "(2+3",
    "2(3)",
    "alert(1)",
    "1e4",
    "9".repeat(201),
    "0.1234567890123",
    "999999999999999 * 2",
  ]) {
    expect(() => calculate(expression)).toThrow();
  }
});
