import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { calculateSafeToSpend, calculateShortfallRisk } from '@flowmoney/calculations';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getDashboard(userId: string) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) {
      return {
        userId,
        preferredCurrency: 'NGN',
        currentFunds: 0,
        pendingIncome: 0,
        projectedIncome: 0,
        expectedIncomeByConfidence: { CONFIRMED: 0, LIKELY: 0, UNCERTAIN: 0 },
        protectedObligations: 0,
        minimumBuffer: 0,
        safeToSpend: 0,
        projectedPosition: 0,
        riskLevel: 'LOW',
        warnings: [],
        accounts: [],
        expectedIncome: [],
        obligations: [],
      };
    }

    const [accounts, expectedIncome, obligations] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expectedIncome.findMany({
        where: { userId: user.id },
        orderBy: { expectedDate: 'asc' },
      }),
      this.prisma.obligation.findMany({
        where: { userId: user.id },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const currentFunds = accounts.reduce<number>(
      (sum, account) => sum + Number(account.balance),
      0,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeExpectedIncome = expectedIncome.filter((item) =>
      ['EXPECTED', 'PARTIAL', 'DELAYED'].includes(item.status),
    );
    const expectedIncomeByConfidence = activeExpectedIncome.reduce(
      (totals, item) => {
        if (item.confidence in totals) {
          totals[item.confidence as keyof typeof totals] += Number(item.amount);
        }
        return totals;
      },
      { CONFIRMED: 0, LIKELY: 0, UNCERTAIN: 0 },
    );
    const pendingIncome = Object.values(expectedIncomeByConfidence).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const overdueOrDelayedIncome = activeExpectedIncome
      .filter((item) => {
        const dueDate = new Date(item.expectedDate);
        dueDate.setHours(0, 0, 0, 0);
        return item.status === 'DELAYED' || dueDate < today;
      })
      .map((item) => {
        const dueDate = new Date(item.expectedDate);
        dueDate.setHours(0, 0, 0, 0);
        return {
          id: item.id,
          title: item.title,
          amount: Number(item.amount),
          status: item.status,
          daysLate: Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000)),
        };
      });
    const delayedIncomeIds = new Set(overdueOrDelayedIncome.map((item) => item.id));
    const projectedIncome = activeExpectedIncome
      .filter((item) => !delayedIncomeIds.has(item.id))
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const protectedObligations = obligations
      .filter(
        (obligation) =>
          obligation.status !== 'PAID' && obligation.status !== 'SKIPPED',
      )
      .reduce<number>(
        (sum, obligation) => sum + Number(obligation.amount),
        0,
      );

    const minimumBuffer = currentFunds * 0.1;
    const safeToSpend = calculateSafeToSpend({
      currentFunds,
      protectedObligations,
      minimumBuffer,
    });
    const projectedPosition = currentFunds - protectedObligations - minimumBuffer + projectedIncome;
    const warnings: Array<{
      code: string;
      message: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      amount?: number;
      obligationId?: string;
      title?: string;
      daysLate?: number;
    }> = [];
    const shortfall = Math.max(0, protectedObligations + minimumBuffer - currentFunds);
    const shortfallSeverity = calculateShortfallRisk(
      shortfall,
      protectedObligations,
      minimumBuffer,
    );

    if (shortfall > 0) {
      warnings.push({
        code: 'protected_obligations_shortfall',
        message: 'Current funds may not fully cover upcoming commitments and the safety buffer.',
        severity: shortfallSeverity,
        amount: shortfall,
      });
    }

    const availableForObligations = Math.max(0, currentFunds - minimumBuffer);
    const activeObligations = obligations
      .filter((obligation) => obligation.status !== 'PAID' && obligation.status !== 'SKIPPED')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
    let obligationsDueSoFar = 0;
    for (const obligation of activeObligations) {
      const before = obligationsDueSoFar;
      obligationsDueSoFar += Number(obligation.amount);
      const uncoveredAmount = Math.max(0, obligationsDueSoFar - availableForObligations)
        - Math.max(0, before - availableForObligations);
      if (uncoveredAmount > 0) {
        warnings.push({
          code: 'obligation_at_risk',
          message: `${obligation.title} may not be fully covered by current funds after the safety buffer.`,
          severity: shortfallSeverity,
          amount: uncoveredAmount,
          obligationId: obligation.id,
          title: obligation.title,
        });
      }
    }

    for (const income of overdueOrDelayedIncome) {
      warnings.push({
        code: 'expected_income_delayed',
        message: income.daysLate > 0
          ? `${income.title} is ${income.daysLate} ${income.daysLate === 1 ? 'day' : 'days'} late and excluded from projected income.`
          : `${income.title} is marked delayed and excluded from projected income.`,
        severity: income.daysLate >= 14 ? 'HIGH' : 'MEDIUM',
        amount: income.amount,
        title: income.title,
        daysLate: income.daysLate,
      });
    }

    const currenciesInUse = [...new Set(accounts.map((account) => account.currency))];
    if (currenciesInUse.some((accountCurrency) => accountCurrency !== user.preferredCurrency)) {
      warnings.push({
        code: 'currency_mismatch',
        message: 'Some funds use a different currency code. Totals do not perform foreign-exchange conversion.',
        severity: 'LOW',
      });
    }

    return {
      userId,
      preferredCurrency: user.preferredCurrency,
      currentFunds,
      pendingIncome,
      projectedIncome,
      expectedIncomeByConfidence,
      protectedObligations,
      minimumBuffer,
      safeToSpend,
      projectedPosition,
      riskLevel: warnings.some((warning) => warning.severity === 'HIGH')
        ? 'HIGH'
        : warnings.some((warning) => warning.severity === 'MEDIUM')
          ? 'MEDIUM'
          : 'LOW',
      warnings,
      accounts,
      expectedIncome,
      obligations,
    };
  }
}
