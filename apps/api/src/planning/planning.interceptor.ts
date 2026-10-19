import {
  Injectable,
  ServiceUnavailableException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
@Injectable()
export class PlanningDatabaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const failure = error as { code?: string; errorCode?: string } | null;
        if (
          [
            'P1000',
            'P1001',
            'P1002',
            'P1008',
            'P1017',
            'P2024',
            'P2021',
            'P2022',
          ].includes(failure?.code ?? failure?.errorCode ?? '')
        )
          return throwError(
            () =>
              new ServiceUnavailableException(
                'Planning storage is unavailable. Refresh before retrying; the API may need its latest migration.',
              ),
          );
        return throwError(() => error);
      }),
    );
  }
}
