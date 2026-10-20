import { Prisma } from '@prisma/client';
import { sumMoney } from '../currencies/currency.logic.js';
import { ExchangeRatesService } from '../currencies/exchange-rates.service.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import {
  calculateSafeToSpend,
  calculateShortfallRisk,
} from '@flowmoney/calculations';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly fx: ExchangeRatesService,
  ) {}

  async getDashboard(userId: string) {
    const user = await this.usersService.findByClerkId(userId, true);
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

    const [rawAccounts, rawIncome, rawObligations] = await Promise.all([
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

    const quote = await this.fx.quote(
      [
        ...rawAccounts.map((a) => a.currency),
        ...rawIncome.map((a) => a.currency),
        ...rawObligations.map((a) => a.currency),
      ],
      user.preferredCurrency,
    );
    const accounts = rawAccounts.map((a) => ({
      ...a,
      originalBalance: a.balance,
      originalCurrency: a.currency,
      balance: quote.convert(a.balance.toString(), a.currency),
      currency: quote.target,
    }));
    const expectedIncome = rawIncome.map((a) => ({
      ...a,
      originalAmount: a.amount,
      originalCurrency: a.currency,
      amount: quote.convert(a.amount.toString(), a.currency),
      currency: quote.target,
    }));
    const obligations = rawObligations.map((a) => ({
      ...a,
      originalAmount: a.amount,
      originalCurrency: a.currency,
      amount: quote.convert(a.amount.toString(), a.currency),
      currency: quote.target,
    }));

    const currentFunds = sumMoney(
      accounts.map((a) => a.balance),
      quote.target,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeExpectedIncome = expectedIncome.filter((item) =>
      ['EXPECTED', 'PARTIAL', 'DELAYED'].includes(item.status),
    );
    const expectedIncomeByConfidence = activeExpectedIncome.reduce(
      (totals, item) => {
        if (item.confidence in totals) {
          totals[item.confidence as keyof typeof totals] = sumMoney(
            [
              totals[item.confidence as keyof typeof totals],
              Number(item.amount),
            ],
            quote.target,
          );
        }
        return totals;
      },
      { CONFIRMED: 0, LIKELY: 0, UNCERTAIN: 0 },
    );
    const pendingIncome = sumMoney(
      Object.values(expectedIncomeByConfidence),
      quote.target,
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
          daysLate: Math.max(
            0,
            Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000),
          ),
        };
      });
    const delayedIncomeIds = new Set(
      overdueOrDelayedIncome.map((item) => item.id),
    );
    const projectedIncome = sumMoney(
      activeExpectedIncome
        .filter((item) => !delayedIncomeIds.has(item.id))
        .map((item) => Number(item.amount)),
      quote.target,
    );

    const protectedObligations = sumMoney(
      obligations
        .filter((o) => o.status !== 'PAID' && o.status !== 'SKIPPED')
        .map((o) => Number(o.amount)),
      quote.target,
    );

    const minimumBuffer = quote.convert(
      new Prisma.Decimal(currentFunds).div(10).toString(),
      quote.target,
    );
    const safeToSpend = quote.convert(
      String(
        calculateSafeToSpend({
          currentFunds,
          protectedObligations,
          minimumBuffer,
        }),
      ),
      quote.target,
    );
    const projectedPosition = sumMoney(
      [currentFunds, -protectedObligations, -minimumBuffer, projectedIncome],
      quote.target,
    );
    const warnings: Array<{
      code: string;
      message: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      amount?: number;
      obligationId?: string;
      title?: string;
      daysLate?: number;
    }> = [];
    const shortfall = Math.max(
      0,
      sumMoney(
        [protectedObligations, minimumBuffer, -currentFunds],
        quote.target,
      ),
    );
    const shortfallSeverity = calculateShortfallRisk(
      shortfall,
      protectedObligations,
      minimumBuffer,
    );

    if (shortfall > 0) {
      warnings.push({
        code: 'protected_obligations_shortfall',
        message:
          'Current funds may not fully cover upcoming commitments and the safety buffer.',
        severity: shortfallSeverity,
        amount: shortfall,
      });
    }

    const availableForObligations = Math.max(0, currentFunds - minimumBuffer);
    const activeObligations = obligations
      .filter(
        (obligation) =>
          obligation.status !== 'PAID' && obligation.status !== 'SKIPPED',
      )
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      );
    let obligationsDueSoFar = 0;
    for (const obligation of activeObligations) {
      const before = obligationsDueSoFar;
      obligationsDueSoFar = sumMoney(
        [obligationsDueSoFar, Number(obligation.amount)],
        quote.target,
      );
      const uncoveredAmount = sumMoney(
        [
          Math.max(
            0,
            sumMoney(
              [obligationsDueSoFar, -availableForObligations],
              quote.target,
            ),
          ),
          -Math.max(
            0,
            sumMoney([before, -availableForObligations], quote.target),
          ),
        ],
        quote.target,
      );
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
        message:
          income.daysLate > 0
            ? `${income.title} is ${income.daysLate} ${income.daysLate === 1 ? 'day' : 'days'} late and excluded from projected income.`
            : `${income.title} is marked delayed and excluded from projected income.`,
        severity: income.daysLate >= 14 ? 'HIGH' : 'MEDIUM',
        amount: income.amount,
        title: income.title,
        daysLate: income.daysLate,
      });
    }

    return {
      userId,
      preferredCurrency: user.preferredCurrency,
      fx: { estimated: quote.estimated, asOf: quote.asOf, stale: quote.stale },
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
