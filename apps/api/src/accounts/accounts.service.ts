import {
  currencyCode,
  validateStoredAmount,
} from '../currencies/currency.logic.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async ensureUser(userId: string) {
    return this.usersService.getOrCreateForClerk({
      clerkId: userId,
    });
  }

  async listAccounts(userId: string) {
    const user = await this.usersService.findByClerkId(userId);
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
    const user = await this.ensureUser(userId);

    const source = currencyCode(
      payload.currency ??
        ('preferredCurrency' in user ? user.preferredCurrency : undefined),
    );
    validateStoredAmount(payload.balance, source, true);
    return this.prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: payload.name,
        balance: payload.balance ?? 0,
        currency: source,
      },
    });
  }

  async updateAccount(
    userId: string,
    accountId: string,
    payload: { name?: string; balance?: number; currency?: string },
  ) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (
      payload.currency !== undefined &&
      currencyCode(payload.currency) !== account.currency
    )
      throw new BadRequestException(
        'The original account currency cannot be changed by relabeling.',
      );

    if (payload.balance !== undefined)
      validateStoredAmount(payload.balance, account.currency, true);
    return this.prisma.financialAccount.update({
      where: { id: accountId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
        ...(payload.currency !== undefined
          ? { currency: payload.currency }
          : {}),
      },
    });
  }

  async deleteAccount(userId: string, accountId: string) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.financialAccount.delete({
      where: { id: accountId },
    });
  }
}
