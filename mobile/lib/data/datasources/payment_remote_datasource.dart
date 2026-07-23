import '../../core/network/api_client.dart';

class PaymentIntentResult {
  final String clientSecret;
  final int amountCents;
  final String bookingRef;

  const PaymentIntentResult({
    required this.clientSecret,
    required this.amountCents,
    required this.bookingRef,
  });
}

class PaymentRemoteDataSource {
  final ApiClient _client;

  const PaymentRemoteDataSource(this._client);

  Future<PaymentIntentResult> createIntent(String bookingId) async {
    final data = await _client.post('/payments/create-intent', data: {
      'bookingId': bookingId,
    });
    return PaymentIntentResult(
      clientSecret: data['clientSecret'] as String,
      amountCents: data['amount'] as int,
      bookingRef: data['bookingRef'] as String? ?? '',
    );
  }
}
