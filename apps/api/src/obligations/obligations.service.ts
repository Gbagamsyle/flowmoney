import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

@Injectable()
export class ObligationsService {
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

  async list(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return [];
    }

    return this.prisma.obligation.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(
    userId: string,
    payload: { title: string; amount: number; dueDate: string; priority: string; status?: string },
  ) {
    const user = await this.ensureDemoUser(userId);

    return this.prisma.obligation.create({
      data: {
        userId: user.id,
        title: payload.title,
        amount: payload.amount ?? 0,
        dueDate: new Date(payload.dueDate),
        priority: payload.priority as any,
        status: (payload.status ?? 'PENDING') as any,
      },
    });
  }
}
