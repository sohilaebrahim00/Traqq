import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../error/exceptions.dart';
import '../services/secure_storage_service.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorageService _storage;

  /// Exposes the underlying Dio instance for widgets that need
  /// CancelToken support (e.g. address autocomplete debouncing).
  Dio get dio => _dio;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(milliseconds: AppConfig.connectTimeoutMs),
      receiveTimeout: const Duration(milliseconds: AppConfig.receiveTimeoutMs),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(_TokenInterceptor(_storage, _dio));
    _dio.interceptors.add(LogInterceptor(
      requestBody: false,
      responseBody: false,
      error: true,
    ));
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) =>
      _request(() => _dio.get(path, queryParameters: queryParameters));

  Future<dynamic> post(String path, {dynamic data}) =>
      _request(() => _dio.post(path, data: data));

  Future<dynamic> patch(String path, {dynamic data}) =>
      _request(() => _dio.patch(path, data: data));

  Future<dynamic> put(String path, {dynamic data}) =>
      _request(() => _dio.put(path, data: data));

  Future<dynamic> delete(String path) =>
      _request(() => _dio.delete(path));

  Future<dynamic> _request(Future<Response> Function() call) async {
    try {
      final response = await call();
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  ApiException _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionTimeout) {
      return const NetworkException();
    }

    final statusCode = e.response?.statusCode;
    final data = e.response?.data;
    final message = _extractMessage(data);

    return switch (statusCode) {
      400 => ValidationException(
          message,
          fieldErrors: _extractFieldErrors(data),
        ),
      401 => const UnauthorizedException(),
      402 => PaymentException(message),
      403 => ApiException('Access denied.', statusCode: 403),
      404 => NotFoundException(message),
      409 => CapacityException(message),
      429 => const ApiException('Too many requests. Please try again later.', statusCode: 429),
      503 => const ServerException('Service temporarily unavailable.'),
      _ => ApiException(message.isNotEmpty ? message : 'Something went wrong.', statusCode: statusCode),
    };
  }

  String _extractMessage(dynamic data) {
    if (data == null) return '';
    if (data is Map) {
      return (data['error'] ?? data['message'] ?? '').toString();
    }
    return '';
  }

  Map<String, String>? _extractFieldErrors(dynamic data) {
    if (data is! Map) return null;
    final errors = data['errors'];
    if (errors is! Map) return null;
    return errors.map((k, v) => MapEntry(k.toString(), v.toString()));
  }
}

class _TokenInterceptor extends Interceptor {
  final SecureStorageService _storage;
  final Dio _dio;
  bool _isRefreshing = false;

  _TokenInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for auth endpoints
    if (options.path.contains('/auth/') || options.path.contains('/driver/login')) {
      return handler.next(options);
    }
    final token = await _storage.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await _storage.refreshToken;
        if (refreshToken == null) {
          _isRefreshing = false;
          return handler.next(err);
        }
        final response = await _dio.post(
          '/auth/refresh',
          data: {'refreshToken': refreshToken},
          options: Options(headers: {'Authorization': null}),
        );
        final newToken = response.data['accessToken'] as String;
        await _storage.saveAccessToken(newToken);

        // Retry original request
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer $newToken';
        final retryResponse = await _dio.fetch(retryOptions);
        _isRefreshing = false;
        return handler.resolve(retryResponse);
      } catch (_) {
        _isRefreshing = false;
        await _storage.clearAll();
      }
    }
    handler.next(err);
  }
}
