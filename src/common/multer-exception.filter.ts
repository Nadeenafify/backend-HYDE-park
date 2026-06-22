import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import type { Response } from 'express';

/**
 * Multer throws a raw `MulterError` (not an HttpException) when an upload breaks
 * a limit — e.g. a receipt over 10 MB or more than one file. Without this filter
 * Nest maps those to a generic 500. Translate them into the right 4xx so the
 * client gets an actionable response (and the test plan's "oversize → 413/400"
 * holds).
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(err: MulterError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    const status = tooBig
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : HttpStatus.BAD_REQUEST;
    const message = tooBig
      ? 'Receipt is too large — the maximum size is 10 MB.'
      : err.code === 'LIMIT_FILE_COUNT'
        ? 'Only a single receipt file may be uploaded.'
        : `Upload error: ${err.message}`;
    res.status(status).json({
      statusCode: status,
      error: tooBig ? 'Payload Too Large' : 'Bad Request',
      message,
    });
  }
}
