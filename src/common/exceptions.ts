/**
 * Throw these anywhere in a controller or service. `error.middleware.ts`
 * turns them into `{ "error": "<message>" }` with the right status code.
 * Anything that is not an `HttpException` becomes a 500.
 */
export class HttpException extends Error {
  public status: number;
  public headers: Record<string, string>;

  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = "Bad Request") {
    super(400, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ConflictException extends HttpException {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message = "Unprocessable Entity") {
    super(422, message);
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message: string, retryAfterSeconds: number) {
    super(429, message, { "Retry-After": String(retryAfterSeconds) });
  }
}
