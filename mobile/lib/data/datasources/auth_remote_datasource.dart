import '../models/user_model.dart';
import '../../core/network/api_client.dart';

class AuthResult {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  const AuthResult({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });
}

class AuthRemoteDataSource {
  final ApiClient _client;

  const AuthRemoteDataSource(this._client);

  Future<AuthResult> register({
    required String fullName,
    required String phoneNumber,
    required String password,
    String? email,
  }) async {
    final data = await _client.post('/auth/register', data: {
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'password': password,
      if (email != null && email.isNotEmpty) 'email': email,
    });
    return AuthResult(
      user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final data = await _client.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResult(
      user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  /// Driver login accepts email OR phone number
  Future<AuthResult> driverLogin({
    required String identifier,
    required String password,
  }) async {
    final data = await _client.post('/driver/login', data: {
      'identifier': identifier,
      'password': password,
    });
    return AuthResult(
      user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }
}
