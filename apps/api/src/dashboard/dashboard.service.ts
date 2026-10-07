import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { calculateSafeToSpend } from '@flowmoney/calculations';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [accounts, expectedIncome, obligations] = (await Promise.all([
      this.prisma.financialAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expectedIncome.findMany({
        where: { userId },
        orderBy: { expectedDate: 'asc' },
      }),
      this.prisma.obligation.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
      }),
    ])) as [
      Array<{ balance: number | string }>,
      Array<{ amount: number | string }>,
      Array<{ status: string; amount: number | string }>,
    ];

    const currentFunds = accounts.reduce(
      (sum: number, account: { balance: number | string }) => sum + Number(account.balance),
      0,
    );

    const pendingIncome = expectedIncome.reduce(
      (sum: number, item: { amount: number | string }) => sum + Number(item.amount),
      0,
    );

    const protectedObligations = obligations
      .filter(
        (obligation: { status: string; amount: number | string }) =>
          obligation.status !== 'PAID' && obligation.status !== 'SKIPPED',
      )
      .reduce(
        (sum: number, obligation: { amount: number | string }) => sum + Number(obligation.amount),
        0,
      );

    const minimumBuffer = currentFunds * 0.1;

    return {
      userId,
      currentFunds,
      pendingIncome,
      protectedObligations,
      minimumBuffer,
      safeToSpend: calculateSafeToSpend({
        currentFunds,
        protectedObligations,
        minimumBuffer,
      }),
      accounts,
      expectedIncome,
      obligations,
    };
  }
}
