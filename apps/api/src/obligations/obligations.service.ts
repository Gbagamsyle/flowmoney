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

const PRIORITIES = ['ESSENTIAL', 'IMPORTANT', 'FLEXIBLE', 'OPTIONAL'] as const;
const STATUSES = ['PENDING', 'FUNDED', 'PAID', 'SKIPPED'] as const;

type ObligationPayload = {
  currency?: string;
  title: string;
  amount: number;
  dueDate: string;
  priority: string;
};

type ObligationUpdate = Partial<ObligationPayload> & { status?: string };

@Injectable()
export class ObligationsService {
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

    return this.prisma.obligation.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(userId: string, payload: ObligationPayload) {
    this.validate(payload);
    const user = await this.ensureUser(userId);

    const source = currencyCode(
      payload.currency ??
        ('preferredCurrency' in user ? user.preferredCurrency : undefined),
    );
    validateStoredAmount(payload.amount, source);
    return this.prisma.obligation.create({
      data: {
        userId: user.id,
        title: payload.title,
        currency: source,
        amount: payload.amount,
        dueDate: new Date(payload.dueDate),
        priority: payload.priority as (typeof PRIORITIES)[number],
        status: 'PENDING',
      },
    });
  }

  async update(
    userId: string,
    obligationId: string,
    payload: ObligationUpdate,
  ) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) throw new NotFoundException('User not found');

    if (
      payload.priority &&
      !PRIORITIES.includes(payload.priority as (typeof PRIORITIES)[number])
    ) {
      throw new BadRequestException('Choose a valid obligation priority.');
    }
    if (
      payload.status &&
      !STATUSES.includes(payload.status as (typeof STATUSES)[number])
    ) {
      throw new BadRequestException('Choose a valid obligation status.');
    }
    if (payload.title !== undefined && !payload.title.trim()) {
      throw new BadRequestException('Obligation name cannot be empty.');
    }
    if (
      payload.amount !== undefined &&
      (!Number.isFinite(payload.amount) || payload.amount <= 0)
    ) {
      throw new BadRequestException('Amount must be greater than zero.');
    }
    if (
      payload.dueDate !== undefined &&
      Number.isNaN(new Date(payload.dueDate).getTime())
    ) {
      throw new BadRequestException('Choose a valid due date.');
    }

    const obligation = await this.prisma.obligation.findFirst({
      where: { id: obligationId, userId: user.id },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');

    if (
      payload.currency !== undefined &&
      currencyCode(payload.currency) !== obligation.currency
    )
      throw new BadRequestException(
        'The original currency cannot be changed. Confirm older records in Settings.',
      );

    if (payload.amount !== undefined && obligation.currency)
      validateStoredAmount(payload.amount, obligation.currency);
    if (payload.amount !== undefined && !obligation.currency)
      throw new BadRequestException(
        'Confirm the original currency in Settings before editing the amount.',
      );
    return this.prisma.obligation.update({
      where: { id: obligationId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
        ...(payload.dueDate !== undefined
          ? { dueDate: new Date(payload.dueDate) }
          : {}),
        ...(payload.priority !== undefined
          ? { priority: payload.priority as (typeof PRIORITIES)[number] }
          : {}),
        ...(payload.status !== undefined
          ? { status: payload.status as (typeof STATUSES)[number] }
          : {}),
      },
    });
  }

  async delete(userId: string, obligationId: string) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user) throw new NotFoundException('User not found');

    const obligation = await this.prisma.obligation.findFirst({
      where: { id: obligationId, userId: user.id },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');

    return this.prisma.obligation.delete({ where: { id: obligationId } });
  }

  private validate(payload: ObligationPayload) {
    if (!payload.title?.trim())
      throw new BadRequestException('Obligation name cannot be empty.');
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }
    if (Number.isNaN(new Date(payload.dueDate).getTime())) {
      throw new BadRequestException('Choose a valid due date.');
    }
    if (!PRIORITIES.includes(payload.priority as (typeof PRIORITIES)[number])) {
      throw new BadRequestException('Choose a valid obligation priority.');
    }
  }
}
