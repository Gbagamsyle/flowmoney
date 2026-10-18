import {
  Injectable,
  ServiceUnavailableException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';

@Injectable()
export class StatementsDatabaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const failure = error as { code?: string; errorCode?: string } | null;
        const code = failure?.code ?? failure?.errorCode;
        if (
          code &&
          ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(code)
        ) {
          return throwError(
            () =>
              new ServiceUnavailableException(
                'Statement storage is temporarily unavailable. Please wait a moment, then refresh history before retrying your upload or approval.',
              ),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
