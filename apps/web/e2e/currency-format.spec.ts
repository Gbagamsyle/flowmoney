import { expect, test } from "@playwright/test";
import { formatMoney } from "../lib/format-money";
test("currency displays preserve cents and respect zero-decimal currencies", () => {
  expect(formatMoney(100.25, "USD", "en-US")).toBe("$100.25");
  expect(formatMoney(150000, "NGN", "en-NG")).toContain("150,000.00");
  expect(formatMoney(150.5, "JPY", "en-US", 2)).toBe("¥151");
  expect(formatMoney(600, "XOF", "en-US", 2)).not.toContain(".00");
  expect(formatMoney(100, "GBP", "en-GB", 0)).toBe("£100");
});
