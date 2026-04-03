import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request?.method) return next.handle();

    const requestId = uuidv4();
    const { method, url } = request;
    const start = Date.now();

    (request as any).requestId = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms [${requestId}]`,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          const status = error?.status || error?.getStatus?.() || 500;
          this.logger.warn(
            `${method} ${url} ${status} ${duration}ms [${requestId}] ${error.message || ''}`,
          );
        },
      }),
    );
  }
}
