type CategoryLabels = { name: string; incoming: string; outgoing: string };

const labels: Record<string, CategoryLabels> = {
  Betting: {
    name: "Betting payments",
    incoming: "Betting-related money received",
    outgoing: "Payments to betting operators",
  },
  "Betting Payout": {
    name: "Money from betting operators",
    incoming: "Money received from betting operators",
    outgoing: "Betting-related payments",
  },
  "Merchant Credit": {
    name: "Money from merchants",
    incoming: "Money received from merchants",
    outgoing: "Merchant-related payments",
  },
  "Food & Dining": {
    name: "Food and dining",
    incoming: "Food-related money received",
    outgoing: "Food and dining purchases",
  },
  Transport: {
    name: "Transport",
    incoming: "Transport-related money received",
    outgoing: "Transport payments",
  },
  Contribution: {
    name: "Contributions",
    incoming: "Contributions received",
    outgoing: "Contributions sent",
  },
  Gift: { name: "Gifts", incoming: "Gifts received", outgoing: "Gifts sent" },
  Income: {
    name: "Income",
    incoming: "Income received",
    outgoing: "Payments labeled as income — review",
  },
  Purchase: {
    name: "Merchant purchases",
    incoming: "Purchase credits to review",
    outgoing: "Merchant purchases",
  },
  Bill: {
    name: "Bills",
    incoming: "Bill credits to review",
    outgoing: "Bills paid",
  },
  "Airtime/Data": {
    name: "Airtime and data",
    incoming: "Airtime or data credits to review",
    outgoing: "Airtime and data bought",
  },
  "Bank Fee": {
    name: "Bank fees",
    incoming: "Fee credits to review",
    outgoing: "Bank fees charged",
  },
  "Cash Withdrawal": {
    name: "Cash withdrawals",
    incoming: "Cash credits to review",
    outgoing: "Cash withdrawn",
  },
  Savings: {
    name: "Savings movements",
    incoming: "Withdrawn from savings",
    outgoing: "Moved to savings",
  },
  "Own-account Transfer": {
    name: "Between your accounts",
    incoming: "Moved from your other accounts",
    outgoing: "Moved to your other accounts",
  },
  "External Transfer": {
    name: "Transfers",
    incoming: "Transfers received",
    outgoing: "Transfers sent",
  },
  Loan: {
    name: "Loan-related activity",
    incoming: "Loan-related money received",
    outgoing: "Loan-related payments",
  },
  Subscription: {
    name: "Subscriptions",
    incoming: "Subscription credits to review",
    outgoing: "Subscriptions paid",
  },
  Refund: {
    name: "Refunds and reversals",
    incoming: "Refunds and reversals received",
    outgoing: "Refund-related payments or reversals",
  },
  Unknown: {
    name: "Purpose unspecified",
    incoming: "Money received, purpose unspecified",
    outgoing: "Payments with unspecified purpose",
  },
};

export function categoryName(category: string) {
  return labels[category]?.name ?? category;
}

export function movementLabel(category: string, direction: string) {
  const categoryLabels = labels[category];
  if (!categoryLabels)
    return direction === "IN" ? "Money received" : "Money leaving this account";
  return direction === "IN" ? categoryLabels.incoming : categoryLabels.outgoing;
}

export function categoryMovements(
  category: string,
  totals: { inflow: number; outflow: number },
) {
  return [
    {
      direction: "OUT",
      label: movementLabel(category, "OUT"),
      amount: totals.outflow,
    },
    {
      direction: "IN",
      label: movementLabel(category, "IN"),
      amount: totals.inflow,
    },
  ].filter((movement) => movement.amount > 0);
}
