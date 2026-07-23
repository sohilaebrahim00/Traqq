import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _store = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _accessTokenKey  = 'traqq_access_token';
  static const _refreshTokenKey = 'traqq_refresh_token';
  static const _userKey         = 'traqq_user';
  static const _userRoleKey     = 'traqq_user_role';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _store.write(key: _accessTokenKey, value: accessToken),
      _store.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<String?> get accessToken  => _store.read(key: _accessTokenKey);
  Future<String?> get refreshToken => _store.read(key: _refreshTokenKey);

  Future<void> saveUser(String userJson, String role) async {
    await Future.wait([
      _store.write(key: _userKey, value: userJson),
      _store.write(key: _userRoleKey, value: role),
    ]);
  }

  Future<String?> get userJson => _store.read(key: _userKey);
  Future<String?> get userRole => _store.read(key: _userRoleKey);

  Future<void> saveAccessToken(String token) =>
      _store.write(key: _accessTokenKey, value: token);

  Future<void> clearAll() async {
    await Future.wait([
      _store.delete(key: _accessTokenKey),
      _store.delete(key: _refreshTokenKey),
      _store.delete(key: _userKey),
      _store.delete(key: _userRoleKey),
    ]);
  }

  Future<bool> get hasSession async {
    final token = await accessToken;
    return token != null && token.isNotEmpty;
  }
}
