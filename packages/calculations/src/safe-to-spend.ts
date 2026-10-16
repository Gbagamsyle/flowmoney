export type FinancialPositionInput = {
  currentFunds: number;
  protectedObligations: number;
  minimumBuffer: number;
};

export function calculateSafeToSpend({
  currentFunds,
  protectedObligations,
  minimumBuffer,
}: FinancialPositionInput) {
  return Math.max(0, currentFunds - protectedObligations - minimumBuffer);
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export function calculateShortfallRisk(
  shortfall: number,
  protectedObligations: number,
  minimumBuffer: number,
): RiskLevel {
  if (shortfall <= 0) return 'LOW';
  const shortfallRatio = shortfall / Math.max(1, protectedObligations + minimumBuffer);
  return shortfallRatio >= 0.25 ? 'HIGH' : 'MEDIUM';
}

export type ScenarioPositionInput = FinancialPositionInput & {
  pendingIncome: number;
  fundsChange: number;
  additionalObligations: number;
  expectedIncomeChange: number;
};

export type ScenarioIncome = {
  amount: number;
  expectedDate: Date | string;
  status: string;
};

export type EvaluateScenarioInput = FinancialPositionInput & {
  currentFunds: number;
  pendingIncome: number;
  expectedIncome: ScenarioIncome[];
  expectedIncomeDelayDays?: number;
  expectedIncomeReduction?: number;
  addedExpense?: number;
  bufferOverride?: number;
};

export function calculateScenarioPosition({
  currentFunds,
  protectedObligations,
  minimumBuffer,
  pendingIncome,
  fundsChange,
  additionalObligations,
  expectedIncomeChange,
}: ScenarioPositionInput) {
  const scenarioFunds = Math.max(0, currentFunds + fundsChange);
  const scenarioObligations = Math.max(0, protectedObligations + additionalObligations);
  const scenarioBuffer = scenarioFunds === currentFunds
    ? minimumBuffer
    : scenarioFunds * (currentFunds > 0 ? minimumBuffer / currentFunds : 0.1);
  const safeToSpend = calculateSafeToSpend({
    currentFunds: scenarioFunds,
    protectedObligations: scenarioObligations,
    minimumBuffer: scenarioBuffer,
  });
  const projectedPosition = scenarioFunds - scenarioObligations - scenarioBuffer
    + Math.max(0, pendingIncome + expectedIncomeChange);

  return {
    currentFunds: scenarioFunds,
    protectedObligations: scenarioObligations,
    minimumBuffer: scenarioBuffer,
    safeToSpend,
    projectedPosition,
    shortfall: Math.max(0, scenarioObligations + scenarioBuffer - scenarioFunds),
  };
}

export function evaluateScenario({
  currentFunds,
  protectedObligations,
  minimumBuffer,
  pendingIncome,
  expectedIncome,
  expectedIncomeDelayDays = 0,
  expectedIncomeReduction = 0,
  addedExpense = 0,
  bufferOverride,
}: EvaluateScenarioInput) {
  const buffer = bufferOverride ?? minimumBuffer;
  const scenarioObligations = protectedObligations + addedExpense;
  const safeToSpend = Math.max(0, currentFunds - scenarioObligations - buffer);
  const baselineSafeToSpend = calculateSafeToSpend({
    currentFunds,
    protectedObligations,
    minimumBuffer,
  });
  const now = new Date();
  const delayCutoff = new Date(now.getTime() + expectedIncomeDelayDays * 24 * 60 * 60 * 1000);
  const delayedIncome = expectedIncomeDelayDays > 0
    ? expectedIncome.reduce((sum, income) => {
        const active = ['EXPECTED', 'PARTIAL', 'DELAYED'].includes(income.status);
        const dueDate = new Date(income.expectedDate);
        return active && dueDate >= now && dueDate <= delayCutoff
          ? sum + income.amount
          : sum;
      }, 0)
    : 0;
  const remainingAfterDelay = Math.max(0, pendingIncome - delayedIncome);
  const appliedIncomeReduction = Math.min(remainingAfterDelay, expectedIncomeReduction);
  const baselineProjectedPosition = currentFunds - protectedObligations - minimumBuffer + pendingIncome;
  const projectedPosition = currentFunds
    - scenarioObligations
    - buffer
    + Math.max(0, pendingIncome - delayedIncome - appliedIncomeReduction);
  const shortfall = Math.max(0, scenarioObligations + buffer - currentFunds);
  const shortfallRisk = calculateShortfallRisk(shortfall, scenarioObligations, buffer);
  const warnings: string[] = [];

  if (shortfall > 0) {
    warnings.push('Upcoming obligations and the selected safety buffer may not be fully covered.');
  }
  if (delayedIncome > 0) {
    warnings.push('Expected income due within the selected delay window is excluded from the scenario projection.');
  }
  if (expectedIncomeReduction > pendingIncome) {
    warnings.push('The income reduction is capped at the total active expected income.');
  }

  return {
    baseline: {
      currentFunds,
      protectedObligations,
      safetyBuffer: minimumBuffer,
      pendingIncome,
      safeToSpend: baselineSafeToSpend,
      projectedPosition: baselineProjectedPosition,
    },
    scenario: {
      currentFunds,
      protectedObligations: scenarioObligations,
      safetyBuffer: buffer,
      pendingIncome: Math.max(0, remainingAfterDelay - appliedIncomeReduction),
      delayedIncome,
      incomeReduction: appliedIncomeReduction,
      addedExpense,
      safeToSpend,
      projectedPosition,
      shortfall,
      shortfallRisk,
      upcomingObligationsAtRisk: shortfall,
    },
    changes: {
      expectedIncomeDelayDays,
      expectedIncomeReduction,
      addedExpense,
      bufferOverride: bufferOverride ?? null,
    },
    warnings,
  };
}
