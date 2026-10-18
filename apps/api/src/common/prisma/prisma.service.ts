import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const MAX_CONNECT_ATTEMPTS = 5;
const RETRYABLE_DATABASE_CODES = new Set([
  'P1001', // database server unreachable
  'P1002', // connection timed out
  'P1008', // operation timed out
  'P1017', // server closed the connection
  'P2024', // connection pool timeout
]);

function getPrismaErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { code?: unknown; errorCode?: unknown };
  return typeof value.code === 'string'
    ? value.code
    : typeof value.errorCode === 'string'
      ? value.errorCode
      : undefined;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        const code = getPrismaErrorCode(error);
        if (!code || !RETRYABLE_DATABASE_CODES.has(code) || attempt === MAX_CONNECT_ATTEMPTS) {
          throw error;
        }

        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
        this.logger.warn(
          `Database connection attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed (${code}); retrying in ${delayMs}ms.`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
