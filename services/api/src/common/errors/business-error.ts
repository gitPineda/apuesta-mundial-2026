import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.CONFLICT,
  ) {
    super({ error: code, message, statusCode: status }, status);
  }
}
