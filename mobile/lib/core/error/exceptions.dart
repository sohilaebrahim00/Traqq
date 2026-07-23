class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException([String message = 'Session expired. Please sign in again.'])
      : super(message, statusCode: 401);
}

class NetworkException extends ApiException {
  const NetworkException([String message = 'No internet connection. Please check your network.'])
      : super(message, statusCode: 0);
}

class ServerException extends ApiException {
  const ServerException([String message = 'Server error. Please try again later.'])
      : super(message, statusCode: 500);
}

class ValidationException extends ApiException {
  final Map<String, String>? fieldErrors;

  const ValidationException(String message, {this.fieldErrors})
      : super(message, statusCode: 400);
}

class PaymentException extends ApiException {
  const PaymentException(String message) : super(message, statusCode: 402);
}

class NotFoundException extends ApiException {
  const NotFoundException([String message = 'Not found.']) : super(message, statusCode: 404);
}

class CapacityException extends ApiException {
  const CapacityException(String message) : super(message, statusCode: 409);
}
