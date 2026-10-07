import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDemoUser(userId: string) {
    return this.prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: `${userId}@flowmoney.local`,
      },
    });
  }

  async listAccounts(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return [];
    }

    return this.prisma.financialAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAccount(
    userId: string,
    payload: { name: string; balance: number; currency?: string },
  ) {
    const user = await this.ensureDemoUser(userId);

    return this.prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: payload.name,
        balance: payload.balance ?? 0,
        currency: payload.currency ?? 'NGN',
      },
    });
  }
}
