import '../../core/network/api_client.dart';

class ContactRemoteDataSource {
  final ApiClient _client;

  const ContactRemoteDataSource(this._client);

  Future<void> send({
    required String name,
    required String email,
    required String phone,
    required String type,
    required String message,
  }) async {
    await _client.post('/contact', data: {
      'name': name,
      'email': email,
      if (phone.isNotEmpty) 'phone': phone,
      'type': type,
      'message': message,
    });
  }
}
