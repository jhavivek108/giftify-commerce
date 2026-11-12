/**
 * An error whose message is safe to show to the client.
 * `errors` is an optional list of field problems: [{ path, message }].
 */
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Please log in to continue') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict', errors) {
    return new ApiError(409, message, errors);
  }
  /** A business rule was broken (out of stock, order already delivered...). */
  static unprocessable(message, errors) {
    return new ApiError(422, message, errors);
  }
}
