import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  async getOrCreateForClerk({
    clerkId,
    email,
  }: {
    clerkId: string;
    email?: string;
  }) {
    const normalizedEmail = email ?? `${clerkId}@flowmoney.local`;

    return this.prisma.user.upsert({
      where: { clerkId },
      update: { email: normalizedEmail },
      create: {
        clerkId,
        email: normalizedEmail,
      },
    });
  }
}
