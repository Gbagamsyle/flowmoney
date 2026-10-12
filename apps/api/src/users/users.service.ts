import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

const isDatabaseUnavailable = (error: unknown) => {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'P1001';
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClerkId(clerkId: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { clerkId },
      });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return null;
      }
      throw error;
    }
  }

  async getOrCreateForClerk({
    clerkId,
    email,
  }: {
    clerkId: string;
    email?: string;
  }) {
    const normalizedEmail = email ?? `${clerkId}@flowmoney.local`;

    try {
      return await this.prisma.user.upsert({
        where: { clerkId },
        update: { email: normalizedEmail },
        create: {
          clerkId,
          email: normalizedEmail,
        },
      });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return {
          id: clerkId,
          clerkId,
          email: normalizedEmail,
          onboardingCompletedAt: null,
        };
      }
      throw error;
    }
  }

  async markOnboardingComplete(clerkId: string) {
    await this.getOrCreateForClerk({ clerkId });

    try {
      return await this.prisma.user.update({
        where: { clerkId },
        data: { onboardingCompletedAt: new Date() },
      });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return {
          clerkId,
          onboardingCompletedAt: new Date(),
        };
      }
      throw error;
    }
  }
}
