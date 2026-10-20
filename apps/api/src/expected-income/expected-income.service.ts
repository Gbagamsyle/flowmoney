import {
  currencyCode,
  validateStoredAmount,
} from '../currencies/currency.logic.js';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class ExpectedIncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async ensureUser(userId: string) {
    return this.usersService.getOrCreateForClerk({
      clerkId: userId,
    });
  }

  async list(userId: string) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) {
      return [];
    }

    return this.prisma.expectedIncome.findMany({
      where: { userId: user.id },
      orderBy: { expectedDate: 'asc' },
    });
  }

  async create(
    userId: string,
    payload: {
      title: string;
      amount: number;
      expectedDate: string;
      confidence: string;
      status?: string;
      currency?: string;
    },
  ) {
    const user = await this.ensureUser(userId);

    const source = currencyCode(
      payload.currency ??
        ('preferredCurrency' in user ? user.preferredCurrency : undefined),
    );
    validateStoredAmount(payload.amount, source);
    if (
      !payload.title?.trim() ||
      Number.isNaN(new Date(payload.expectedDate).getTime()) ||
      !['CONFIRMED', 'LIKELY', 'UNCERTAIN'].includes(payload.confidence) ||
      !['EXPECTED', 'RECEIVED', 'PARTIAL', 'DELAYED', 'CANCELLED'].includes(
        payload.status ?? 'EXPECTED',
      )
    )
      throw new BadRequestException(
        'Choose a title, valid date, confidence and status.',
      );
    return this.prisma.expectedIncome.create({
      data: {
        userId: user.id,
        title: payload.title,
        currency: source,
        amount: payload.amount ?? 0,
        expectedDate: new Date(payload.expectedDate),
        confidence: payload.confidence as any,
        status: (payload.status ?? 'EXPECTED') as any,
      },
    });
  }
}
