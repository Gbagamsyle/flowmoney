type Fraction = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint =>
  b ? gcd(b, a % b) : a < BigInt(0) ? -a : a;
function fraction(n: bigint, d = BigInt(1)): Fraction {
  if (!d) throw new Error("Cannot divide by zero.");
  const divisor = gcd(n, d);
  return {
    n: (n / divisor) * (d < BigInt(0) ? -BigInt(1) : BigInt(1)),
    d: (d / divisor) * (d < BigInt(0) ? -BigInt(1) : BigInt(1)),
  };
}
function combine(a: Fraction, b: Fraction, operator: string): Fraction {
  if (operator === "+") return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  if (operator === "-") return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
  if (operator === "*") return fraction(a.n * b.n, a.d * b.d);
  return fraction(a.n * b.d, a.d * b.n);
}
// Exact rational arithmetic until display; no expression evaluation or floating-point accumulation.
export function calculate(expression: string): string {
  if (expression.length > 200)
    throw new Error("Use a shorter calculation (up to 200 characters).");
  const input = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");
  if (!input) throw new Error("Enter a calculation first.");
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%\-]/g) ?? [];
  if (tokens.join("") !== input)
    throw new Error("Use numbers and calculator symbols only.");
  let position = 0;
  function primary(): Fraction {
    const token = tokens[position++];
    let value: Fraction;
    if (token === "+" || token === "-") {
      value = primary();
      return token === "-" ? fraction(-value.n, value.d) : value;
    }
    if (token === "(") {
      value = sum();
      if (tokens[position++] !== ")")
        throw new Error("Close the brackets to finish this calculation.");
    } else {
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))
        throw new Error("Finish the calculation with a number.");
      const [whole, decimal = ""] = token.split(".");
      if ((whole + decimal).length > 24 || decimal.length > 12)
        throw new Error(
          "Use up to 24 digits and 12 decimal places per number.",
        );
      value = fraction(
        BigInt((whole || "0") + decimal),
        BigInt(10) ** BigInt(decimal.length),
      );
    }
    while (tokens[position] === "%") {
      position++;
      value = fraction(value.n, value.d * BigInt(100));
    }
    return value;
  }
  function product(): Fraction {
    let value = primary();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      value = combine(value, primary(), operator);
    }
    return value;
  }
  function sum(): Fraction {
    let value = product();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      value = combine(value, product(), operator);
    }
    return value;
  }
  const result = sum();
  if (position !== tokens.length)
    throw new Error("Check the symbols between your numbers.");
  const scale = BigInt(10) ** BigInt(12);
  const absolute = result.n < BigInt(0) ? -result.n : result.n;
  const rounded =
    ((absolute * scale * BigInt(2)) / result.d + BigInt(1)) / BigInt(2);
  if (rounded / scale > BigInt(999999999999999))
    throw new Error("This result is too large to display accurately.");
  const decimal = (rounded % scale)
    .toString()
    .padStart(12, "0")
    .replace(/0+$/, "");
  return (
    (result.n < BigInt(0) && rounded ? "-" : "") +
    (rounded / scale).toString() +
    (decimal ? "." + decimal : "")
  );
}
