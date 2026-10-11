import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { calculateSafeToSpend } from '@flowmoney/calculations';

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
        currentFunds: 0,
        pendingIncome: 0,
        protectedObligations: 0,
        minimumBuffer: 0,
        safeToSpend: 0,
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

    const pendingIncome = expectedIncome.reduce<number>(
      (sum, item) =>
        ['EXPECTED', 'PARTIAL', 'DELAYED'].includes(item.status)
          ? sum + Number(item.amount)
          : sum,
      0,
    );

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
