import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { currencyCode, sumMoney } from './currency.logic.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class CurrenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fx: ExchangeRatesService,
  ) {}
  private async owner(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user || user.deletedAt)
      throw new NotFoundException('Account not found.');
    return user;
  }
  async display(clerkId: string) {
    const user = await this.owner(clerkId);
    const [accounts, income, obligations] = await Promise.all([
      this.prisma.financialAccount.findMany({ where: { userId: user.id } }),
      this.prisma.expectedIncome.findMany({ where: { userId: user.id } }),
      this.prisma.obligation.findMany({ where: { userId: user.id } }),
    ]);
    const records = [
      ...accounts.map((a) => ({
        kind: 'ACCOUNT',
        id: a.id,
        amount: a.balance.toString(),
        currency: a.currency,
      })),
      ...income.map((a) => ({
        kind: 'INCOME',
        id: a.id,
        amount: a.amount.toString(),
        currency: a.currency,
      })),
      ...obligations.map((a) => ({
        kind: 'OBLIGATION',
        id: a.id,
        amount: a.amount.toString(),
        currency: a.currency,
      })),
    ];
    const known = records.filter((r) => r.currency);
    const quote = await this.fx.quote(
      known.map((r) => r.currency),
      user.preferredCurrency,
    );
    // Return estimates for owned records, never the provider's raw rate table.
    const amounts = known.map((r) => ({
      ...r,
      converted: quote.convert(r.amount, r.currency),
    }));
    return {
      currency: quote.target,
      estimated: quote.estimated,
      asOf: quote.asOf,
      stale: quote.stale,
      unverifiedCount: records.length - known.length,
      amounts,
      currentFunds: sumMoney(
        amounts.filter((a) => a.kind === 'ACCOUNT').map((a) => a.converted),
        quote.target,
      ),
    };
  }
  async summary(clerkId: string, kind: string, id: string) {
    const user = await this.owner(clerkId);
    let source: string;
    let values: Record<string, number>;
    if (kind === 'statement') {
      const statement = await this.prisma.statementImport.findFirst({
        where: { id, userId: user.id },
        include: { transactions: true },
      });
      if (!statement) throw new NotFoundException('Statement not found.');
      source = statement.currency;
      const rows = statement.transactions.filter(
        (r) => statement.status !== 'IMPORTED' || r.approved,
      );
      const incoming = rows
        .filter((r) => r.direction === 'IN')
        .reduce((n, r) => n + Number(r.amountMinor) / 100, 0);
      const outgoing = rows
        .filter((r) => r.direction === 'OUT')
        .reduce((n, r) => n + Number(r.amountMinor) / 100, 0);
      values = {
        'Money in': incoming,
        'Money out': outgoing,
        'Net cash flow': incoming - outgoing,
      };
    } else if (kind === 'plan') {
      const plan = await this.prisma.monthlyPlan.findFirst({
        where: { id, userId: user.id },
      });
      if (!plan) throw new NotFoundException('Plan not found.');
      source = plan.currency;
      const accounts =
        plan.mode === 'LINKED'
          ? await this.prisma.financialAccount.findMany({
              where: { userId: user.id, currency: source },
            })
          : [];
      const funds =
        plan.mode === 'STANDALONE'
          ? Number(plan.startingFundsMinor) / 100
          : accounts.reduce((n, a) => n + Number(a.balance), 0);
      values = {
        'Funds in this plan': funds,
        'Plan buffer': Number(plan.bufferMinor) / 100,
      };
    } else throw new BadRequestException('Choose a plan or statement.');
    const quote = await this.fx.quote([source], user.preferredCurrency);
    return {
      source,
      currency: quote.target,
      estimated: quote.estimated,
      asOf: quote.asOf,
      stale: quote.stale,
      values: Object.entries(values).map(([label, amount]) => ({
        label,
        amount: quote.convert(amount, source),
      })),
    };
  }
  async review(clerkId: string) {
    const user = await this.owner(clerkId);
    const [income, obligations] = await Promise.all([
      this.prisma.expectedIncome.findMany({
        where: { userId: user.id, currency: null },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.obligation.findMany({
        where: { userId: user.id, currency: null },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return [
      ...income.map((r) => ({
        kind: 'INCOME',
        id: r.id,
        title: r.title,
        amount: r.amount.toString(),
      })),
      ...obligations.map((r) => ({
        kind: 'OBLIGATION',
        id: r.id,
        title: r.title,
        amount: r.amount.toString(),
      })),
    ];
  }
  async confirm(clerkId: string, raw: unknown) {
    const body = raw as any;
    if (
      !body ||
      !['INCOME', 'OBLIGATION'].includes(body.kind) ||
      typeof body.id !== 'string' ||
      typeof body.amount !== 'string' ||
      body.amount.length > 20 ||
      !/^\d+(\.\d{1,2})?$/.test(body.amount)
    )
      throw new BadRequestException(
        'Choose a record and its original currency.',
      );
    const currency = currencyCode(body.currency);
    const user = await this.owner(clerkId);
    const args = {
      where: {
        id: body.id,
        userId: user.id,
        currency: null,
        amount: new Prisma.Decimal(body.amount),
      },
      data: { currency },
    };
    const result =
      body.kind === 'INCOME'
        ? await this.prisma.expectedIncome.updateMany(args)
        : await this.prisma.obligation.updateMany(args);
    if (!result.count)
      throw new ConflictException(
        'This record changed, was already confirmed, or is unavailable. Refresh the review list.',
      );
    return { confirmed: true };
  }
}
