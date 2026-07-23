import '../models/booking_model.dart';
import '../../core/network/api_client.dart';

class BookingRemoteDataSource {
  final ApiClient _client;

  const BookingRemoteDataSource(this._client);

  Future<AvailabilityModel> getAvailability(String date) async {
    final data = await _client.get('/bookings/availability', queryParameters: {'date': date});
    return AvailabilityModel.fromJson(data as Map<String, dynamic>);
  }

  Future<BookingModel> createBooking(Map<String, dynamic> payload) async {
    final data = await _client.post('/bookings/create', data: payload);
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  Future<BookingModel> getById(String id) async {
    final data = await _client.get('/bookings/$id');
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Public lookup by booking reference (no auth required).
  /// Returns phoneMasked instead of full phoneNumber.
  Future<BookingModel> getByRef(String ref) async {
    final normalizedRef = ref.toUpperCase().startsWith('TRQ-')
        ? ref.toUpperCase().substring(4)
        : ref.toUpperCase();
    final data = await _client.get('/bookings/by-ref/$normalizedRef');
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Customer edits their own booking — requires _verifyPhone for identity check
  Future<BookingModel> updateByRef({
    required String ref,
    required String verifyPhone,
    Map<String, dynamic>? changes,
  }) async {
    final normalizedRef = ref.toUpperCase().startsWith('TRQ-')
        ? ref.toUpperCase().substring(4)
        : ref.toUpperCase();
    final payload = {
      '_verifyPhone': verifyPhone,
      ...?changes,
    };
    final data = await _client.patch('/bookings/by-ref/$normalizedRef', data: payload);
    return BookingModel.fromJson(data['booking'] as Map<String, dynamic>);
  }

  Future<List<BookingModel>> getMyBookings() async {
    final data = await _client.get('/customer/');
    final list = data as List<dynamic>;
    return list
        .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TrackingModel> getTracking(String bookingRef) async {
    final ref = bookingRef.startsWith('TRQ-') ? bookingRef : 'TRQ-$bookingRef';
    final data = await _client.get('/customer/$ref/tracking');
    return TrackingModel.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> applyPromo({
    required String code,
    required String bookingId,
  }) async {
    final data = await _client.post('/promo/apply', data: {
      'code': code,
      'bookingId': bookingId,
    });
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getConfig() async {
    final data = await _client.get('/config');
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendContactForm({
    required String name,
    required String email,
    required String phone,
    required String type,
    required String message,
  }) async {
    final data = await _client.post('/contact', data: {
      'name': name,
      'email': email,
      'phone': phone,
      'type': type,
      'message': message,
    });
    return data as Map<String, dynamic>;
  }

  /// Returns raw Map so edit_booking_screen can access phoneMasked and displayRef.
  Future<Map<String, dynamic>> getBookingByRef(String ref) async {
    final normalizedRef = ref.toUpperCase().startsWith('TRQ-')
        ? ref.toUpperCase().substring(4)
        : ref.toUpperCase();
    final data = await _client.get('/bookings/by-ref/$normalizedRef');
    return data as Map<String, dynamic>;
  }

  /// Phone verification — sends empty PATCH just to trigger server-side auth check.
  Future<void> verifyBookingPhone(String ref, String phone) async {
    final normalizedRef = ref.toUpperCase().startsWith('TRQ-')
        ? ref.toUpperCase().substring(4)
        : ref.toUpperCase();
    await _client.patch('/bookings/by-ref/$normalizedRef', data: {
      '_verifyPhone': phone,
    });
  }

  /// Customer edit with phone verification.
  Future<void> updateBookingByRef(
    String ref, {
    required String verifyPhone,
    required Map<String, dynamic> changes,
  }) async {
    final normalizedRef = ref.toUpperCase().startsWith('TRQ-')
        ? ref.toUpperCase().substring(4)
        : ref.toUpperCase();
    await _client.patch('/bookings/by-ref/$normalizedRef', data: {
      '_verifyPhone': verifyPhone,
      ...changes,
    });
  }
}
