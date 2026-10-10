import { Injectable } from '@nestjs/common';
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
    payload: { title: string; amount: number; expectedDate: string; confidence: string; status?: string },
  ) {
    const user = await this.ensureUser(userId);

    return this.prisma.expectedIncome.create({
      data: {
        userId: user.id,
        title: payload.title,
        amount: payload.amount ?? 0,
        expectedDate: new Date(payload.expectedDate),
        confidence: payload.confidence as any,
        status: (payload.status ?? 'EXPECTED') as any,
      },
    });
  }
}
