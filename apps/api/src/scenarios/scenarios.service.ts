import { BadRequestException, Injectable } from '@nestjs/common';
import { evaluateScenario } from '@flowmoney/calculations';
import { DashboardService } from '../dashboard/dashboard.service.js';

export type ScenarioChanges = {
  expectedIncomeDelayDays?: number;
  expectedIncomeReduction?: number;
  addedExpense?: number;
  bufferOverride?: number;
};

@Injectable()
export class ScenariosService {
  constructor(private readonly dashboardService: DashboardService) {}

  async evaluate(userId: string, changes: ScenarioChanges) {
    const expectedIncomeDelayDays = changes.expectedIncomeDelayDays ?? 0;
    const expectedIncomeReduction = changes.expectedIncomeReduction ?? 0;
    const addedExpense = changes.addedExpense ?? 0;
    const bufferOverride = changes.bufferOverride;

    if (!Number.isInteger(expectedIncomeDelayDays) || expectedIncomeDelayDays < 0 || expectedIncomeDelayDays > 365) {
      throw new BadRequestException('Expected income delay must be a whole number between 0 and 365 days.');
    }
    for (const [name, value] of Object.entries({ expectedIncomeReduction, addedExpense })) {
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(`${name} must be a non-negative amount.`);
      }
    }
    if (bufferOverride !== undefined && (!Number.isFinite(bufferOverride) || bufferOverride < 0)) {
      throw new BadRequestException('Safety buffer must be a non-negative amount.');
    }

    const baseline = await this.dashboardService.getDashboard(userId);
    const result = evaluateScenario({
      currentFunds: baseline.currentFunds,
      protectedObligations: baseline.protectedObligations,
      minimumBuffer: baseline.minimumBuffer,
      pendingIncome: baseline.pendingIncome,
      expectedIncome: baseline.expectedIncome.map((income) => ({
        amount: Number(income.amount),
        expectedDate: income.expectedDate,
        status: income.status,
      })),
      expectedIncomeDelayDays,
      expectedIncomeReduction,
      addedExpense,
      bufferOverride,
    });

    return {
      preferredCurrency: baseline.preferredCurrency,
      ...result,
    };
  }
}
