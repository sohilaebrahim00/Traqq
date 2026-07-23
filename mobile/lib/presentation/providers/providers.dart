import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/services/secure_storage_service.dart';
import '../../core/services/notification_service.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/datasources/booking_remote_datasource.dart';
import '../../data/datasources/contact_remote_datasource.dart';
import '../../data/datasources/driver_remote_datasource.dart';
import '../../data/datasources/payment_remote_datasource.dart';
import '../../data/datasources/package_remote_datasource.dart';
import '../../data/models/user_model.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/package_model.dart';

class ConfigModel {
  final String? googleMapsApiKey;
  final String? stripePublishableKey;
  const ConfigModel({this.googleMapsApiKey, this.stripePublishableKey});
  factory ConfigModel.fromMap(Map<String, dynamic> m) => ConfigModel(
        googleMapsApiKey: m['googleMapsApiKey'] as String? ??
            m['googleMapsKey'] as String? ??
            m['mapsKey'] as String?,
        stripePublishableKey: m['stripePublishableKey'] as String? ??
            m['stripeKey'] as String?,
      );
}

// ── Services ──────────────────────────────────────────────────────────────────

final secureStorageProvider = Provider<SecureStorageService>(
  (_) => SecureStorageService(),
);

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.read(secureStorageProvider)),
);

final notificationServiceProvider = Provider<NotificationService>(
  (_) => NotificationService(),
);

// ── Data Sources ──────────────────────────────────────────────────────────────

final authDataSourceProvider = Provider<AuthRemoteDataSource>(
  (ref) => AuthRemoteDataSource(ref.read(apiClientProvider)),
);

final bookingDataSourceProvider = Provider<BookingRemoteDataSource>(
  (ref) => BookingRemoteDataSource(ref.read(apiClientProvider)),
);

final driverDataSourceProvider = Provider<DriverRemoteDataSource>(
  (ref) => DriverRemoteDataSource(ref.read(apiClientProvider)),
);

final paymentDataSourceProvider = Provider<PaymentRemoteDataSource>(
  (ref) => PaymentRemoteDataSource(ref.read(apiClientProvider)),
);

final contactDataSourceProvider = Provider<ContactRemoteDataSource>(
  (ref) => ContactRemoteDataSource(ref.read(apiClientProvider)),
);

final packageDataSourceProvider = Provider<PackageRemoteDataSource>(
  (ref) => PackageRemoteDataSource(ref.read(apiClientProvider)),
);

final activePackagesProvider = FutureProvider.autoDispose<List<PackageModel>>((ref) async {
  return ref.read(packageDataSourceProvider).getActivePackages();
});

// ── App Config (Stripe key, Maps key) ─────────────────────────────────────────

final appConfigProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final ds = ref.read(bookingDataSourceProvider);
  return ds.getConfig();
});

final configProvider = FutureProvider<ConfigModel>((ref) async {
  final data = await ref.read(bookingDataSourceProvider).getConfig();
  return ConfigModel.fromMap(data);
});

// ── Auth State ────────────────────────────────────────────────────────────────

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null;
  bool get isDriver   => user?.isDriver ?? false;
  bool get isCustomer => user?.isCustomer ?? false;

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRemoteDataSource _authDs;
  final SecureStorageService _storage;

  AuthNotifier(this._authDs, this._storage) : super(const AuthState());

  Future<void> restoreSession() async {
    final userJson = await _storage.userJson;
    if (userJson == null) return;
    try {
      final user = UserModel.fromJsonString(userJson);
      state = state.copyWith(user: user);
    } catch (_) {
      await _storage.clearAll();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _authDs.login(email: email, password: password);
      await _persist(result);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String phoneNumber,
    required String password,
    String? email,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _authDs.register(
        fullName: fullName,
        phoneNumber: phoneNumber,
        password: password,
        email: email,
      );
      await _persist(result);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> driverLogin({
    required String identifier,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _authDs.driverLogin(
        identifier: identifier,
        password: password,
      );
      await _persist(result);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> signOut() async {
    await _storage.clearAll();
    state = const AuthState();
  }

  void clearError() => state = state.copyWith(clearError: true);

  Future<void> _persist(dynamic result) async {
    await _storage.saveTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    );
    await _storage.saveUser(result.user.toJsonString(), result.user.role);
    state = AuthState(user: result.user);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authDataSourceProvider),
    ref.read(secureStorageProvider),
  );
});

// ── Customer Bookings ─────────────────────────────────────────────────────────

final myBookingsProvider = FutureProvider.autoDispose<List<BookingModel>>((ref) {
  return ref.read(bookingDataSourceProvider).getMyBookings();
});

/// Alias used by booking history and home screens.
final customerBookingsProvider = myBookingsProvider;

final bookingDetailsProvider =
    FutureProvider.autoDispose.family<BookingModel, String>((ref, id) {
  return ref.read(bookingDataSourceProvider).getById(id);
});

/// Alias used by booking details and driver booking detail screens.
final bookingDetailProvider = bookingDetailsProvider;

final trackingProvider =
    FutureProvider.autoDispose.family<TrackingModel, String>((ref, ref_) {
  return ref.read(bookingDataSourceProvider).getTracking(ref_);
});

final availabilityProvider =
    FutureProvider.autoDispose.family<AvailabilityModel, String>((ref, date) {
  return ref.read(bookingDataSourceProvider).getAvailability(date);
});

// ── Driver Bookings ───────────────────────────────────────────────────────────

final driverBookingsProvider = FutureProvider.autoDispose<List<BookingModel>>((ref) {
  return ref.read(driverDataSourceProvider).getBookings();
});

/// Alias used by driver dashboard screen.
final driverAssignedBookingsProvider = driverBookingsProvider;

final driverBookingDetailsProvider =
    FutureProvider.autoDispose.family<BookingModel, String>((ref, id) {
  return ref.read(driverDataSourceProvider).getBookingDetails(id);
});

final driverProfileProvider = FutureProvider.autoDispose<DriverProfileModel?>((ref) async {
  // Return from auth state if available (avoids extra network call).
  final user = ref.watch(authProvider).user;
  if (user?.driverProfile != null) return user!.driverProfile;
  // Fallback: fetch from API.
  try {
    final data = await ref.read(driverDataSourceProvider).getProfile();
    return DriverProfileModel.fromJson(data['driver'] as Map<String, dynamic>? ?? data);
  } catch (_) {
    return null;
  }
});

// ── Booking Flow State ────────────────────────────────────────────────────────

class BookingFlowData {
  final String? tripDirection;
  final String bookingType;
  final DateTime? pickupDate;
  final String? pickupTime;
  final String? pickupAddress;
  final double? pickupLat;
  final double? pickupLng;
  final String? pickupPlaceId;
  final bool addressValidated;
  final String? destinationAddress;
  final double? destinationLat;
  final double? destinationLng;
  final String? destinationPlaceId;
  final bool destValidated;
  final int passengerCount;
  final int vanCount;
  final int carryOnCount;
  final int checkedLuggageCount;
  final bool? wheelchairRequired;
  final String? dropoffTerminal;
  final String? airline;
  final String? departureTime;
  final String? notes;
  final String? phoneNumber;
  final String? email;
  final String? promoCode;

  const BookingFlowData({
    this.tripDirection,
    this.bookingType = 'AIRPORT',
    this.pickupDate,
    this.pickupTime,
    this.pickupAddress,
    this.pickupLat,
    this.pickupLng,
    this.pickupPlaceId,
    this.addressValidated = false,
    this.destinationAddress,
    this.destinationLat,
    this.destinationLng,
    this.destinationPlaceId,
    this.destValidated = false,
    this.passengerCount = 1,
    this.vanCount = 1,
    this.carryOnCount = 0,
    this.checkedLuggageCount = 0,
    this.wheelchairRequired,
    this.dropoffTerminal,
    this.airline,
    this.departureTime,
    this.notes,
    this.phoneNumber,
    this.email,
    this.promoCode,
  });

  BookingFlowData copyWith({
    String? tripDirection,
    String? bookingType,
    DateTime? pickupDate,
    String? pickupTime,
    String? pickupAddress,
    double? pickupLat,
    double? pickupLng,
    String? pickupPlaceId,
    bool? addressValidated,
    String? destinationAddress,
    double? destinationLat,
    double? destinationLng,
    String? destinationPlaceId,
    bool? destValidated,
    int? passengerCount,
    int? vanCount,
    int? carryOnCount,
    int? checkedLuggageCount,
    bool? wheelchairRequired,
    String? dropoffTerminal,
    String? airline,
    String? departureTime,
    String? notes,
    String? phoneNumber,
    String? email,
    String? promoCode,
    bool clearPickupTime = false,
    bool clearWheelchair = false,
  }) =>
      BookingFlowData(
        tripDirection: tripDirection ?? this.tripDirection,
        bookingType: bookingType ?? this.bookingType,
        pickupDate: pickupDate ?? this.pickupDate,
        pickupTime: clearPickupTime ? null : (pickupTime ?? this.pickupTime),
        pickupAddress: pickupAddress ?? this.pickupAddress,
        pickupLat: pickupLat ?? this.pickupLat,
        pickupLng: pickupLng ?? this.pickupLng,
        pickupPlaceId: pickupPlaceId ?? this.pickupPlaceId,
        addressValidated: addressValidated ?? this.addressValidated,
        destinationAddress: destinationAddress ?? this.destinationAddress,
        destinationLat: destinationLat ?? this.destinationLat,
        destinationLng: destinationLng ?? this.destinationLng,
        destinationPlaceId: destinationPlaceId ?? this.destinationPlaceId,
        destValidated: destValidated ?? this.destValidated,
        passengerCount: passengerCount ?? this.passengerCount,
        vanCount: vanCount ?? this.vanCount,
        carryOnCount: carryOnCount ?? this.carryOnCount,
        checkedLuggageCount: checkedLuggageCount ?? this.checkedLuggageCount,
        wheelchairRequired:
            clearWheelchair ? null : (wheelchairRequired ?? this.wheelchairRequired),
        dropoffTerminal: dropoffTerminal ?? this.dropoffTerminal,
        airline: airline ?? this.airline,
        departureTime: departureTime ?? this.departureTime,
        notes: notes ?? this.notes,
        phoneNumber: phoneNumber ?? this.phoneNumber,
        email: email ?? this.email,
        promoCode: promoCode ?? this.promoCode,
      );

  Map<String, dynamic> toApiPayload() {
    final isP2P = tripDirection == 'POINT_TO_POINT';
    return {
      'tripDirection': tripDirection,
      'bookingType': isP2P ? bookingType : 'AIRPORT',
      'pickupDate': pickupDate != null
          ? '${pickupDate!.year}-${pickupDate!.month.toString().padLeft(2, '0')}-${pickupDate!.day.toString().padLeft(2, '0')}'
          : null,
      'pickupTime': pickupTime,
      'pickupAddress': pickupAddress,
      if (pickupLat != null) 'pickupLatitude': pickupLat,
      if (pickupLng != null) 'pickupLongitude': pickupLng,
      if (pickupPlaceId != null) 'pickupPlaceId': pickupPlaceId,
      if (isP2P && destinationAddress != null) 'destinationAddress': destinationAddress,
      if (isP2P && destinationLat != null) 'destinationLatitude': destinationLat,
      if (isP2P && destinationLng != null) 'destinationLongitude': destinationLng,
      if (isP2P && destinationPlaceId != null) 'destinationPlaceId': destinationPlaceId,
      'passengerCount': passengerCount,
      'vanCount': vanCount,
      'carryOnCount': carryOnCount,
      'checkedLuggageCount': checkedLuggageCount,
      'dropoffTerminal': isP2P ? null : dropoffTerminal,
      if (airline != null && airline!.isNotEmpty) 'airline': airline,
      if (departureTime != null && departureTime!.isNotEmpty) 'departureTime': departureTime,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
      'phoneNumber': phoneNumber,
      if (email != null && email!.isNotEmpty) 'email': email,
    };
  }

  double get totalPrice => 99.0 * vanCount;
}

class BookingFlowNotifier extends StateNotifier<BookingFlowData> {
  BookingFlowNotifier() : super(const BookingFlowData());

  void update(BookingFlowData Function(BookingFlowData) updater) {
    state = updater(state);
  }

  void reset() => state = const BookingFlowData();
}

final bookingFlowProvider =
    StateNotifierProvider.autoDispose<BookingFlowNotifier, BookingFlowData>(
  (_) => BookingFlowNotifier(),
);
