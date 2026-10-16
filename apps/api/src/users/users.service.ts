import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

const SUPPORTED_CURRENCIES = new Set([
  'USD', 'GBP', 'EUR', 'NGN', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX',
  'RWF', 'XOF', 'XAF', 'INR', 'JPY', 'CNY', 'SGD', 'NZD', 'CHF', 'SEK', 'NOK',
  'DKK', 'PLN', 'BRL', 'MXN', 'AED', 'SAR', 'TRY', 'EGP',
]);

const isDatabaseUnavailable = (error: unknown) => {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'P1001';
};

const isEmailUniqueConflict = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002' || !('meta' in error)) {
    return false;
  }

  const meta = error.meta;
  if (!meta || typeof meta !== 'object' || !('target' in meta)) {
    return false;
  }

  const target = meta.target;
  return Array.isArray(target)
    ? target.includes('email')
    : typeof target === 'string' && target.toLowerCase().includes('email');
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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
    emailVerified = false,
  }: {
    clerkId: string;
    email?: string;
    emailVerified?: boolean;
  }) {
    const normalizedEmail = email ?? `${clerkId}@flowmoney.local`;
    const update = email && emailVerified ? { email: normalizedEmail } : {};

    try {
      return await this.prisma.user.upsert({
        where: { clerkId },
        update,
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

      if (isEmailUniqueConflict(error)) {
        try {
          if (!emailVerified || !email) {
            throw new ConflictException('Verify this email address before recovering an existing FlowMoney account.');
          }

          const existingUser = await this.prisma.user.findFirst({
            where: { email: normalizedEmail, deletedAt: null },
          });

          if (existingUser) {
            const recoveredUser = await this.prisma.user.update({
              where: { id: existingUser.id },
              data: { clerkId },
            });
            this.logger.log(JSON.stringify({
              event: 'flowmoney_account_relinked',
              userId: existingUser.id,
              clerkId,
            }));
            return recoveredUser;
          }
        } catch (recoveryError) {
          if (isDatabaseUnavailable(recoveryError)) {
            return {
              id: clerkId,
              clerkId,
              email: normalizedEmail,
              onboardingCompletedAt: null,
            };
          }
          throw recoveryError;
        }
      }

      throw error;
    }
  }

  async deleteAccount(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) return;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.expectedIncome.deleteMany({ where: { userId: user.id } });
      await transaction.obligation.deleteMany({ where: { userId: user.id } });
      await transaction.financialAccount.deleteMany({ where: { userId: user.id } });
      await transaction.incomeSource.deleteMany({ where: { userId: user.id } });
      await transaction.user.update({
        where: { id: user.id },
        data: {
          clerkId: `deleted:${user.id}`,
          email: `deleted+${user.id}@deleted.flowmoney.invalid`,
          onboardingCompletedAt: null,
          deletedAt: new Date(),
        },
      });
    });
  }

  async updatePreferredCurrency(clerkId: string, currency: string) {
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      throw new ConflictException('Choose a supported ISO currency code.');
    }

    await this.getOrCreateForClerk({ clerkId });
    return this.prisma.user.update({
      where: { clerkId },
      data: { preferredCurrency: currency, currencyConfirmedAt: new Date() },
      select: { preferredCurrency: true, currencyConfirmedAt: true },
    });
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
