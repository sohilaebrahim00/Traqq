import '../models/booking_model.dart';
import '../../core/network/api_client.dart';

class DriverRemoteDataSource {
  final ApiClient _client;

  const DriverRemoteDataSource(this._client);

  Future<List<BookingModel>> getBookings() async {
    final data = await _client.get('/driver/bookings');
    final list = data as List<dynamic>;
    return list
        .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BookingModel> getBookingDetails(String id) async {
    final data = await _client.get('/driver/bookings/$id');
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  Future<BookingModel> updateStatus(String id, String status) async {
    final data = await _client.patch(
      '/driver/bookings/$id/status',
      data: {'status': status},
    );
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> updateRideStatus(String id, String status) =>
      updateStatus(id, status).then((_) {});

  Future<void> updateLocation(double latitude, double longitude) async {
    await _client.post('/driver/location/update', data: {
      'latitude': latitude,
      'longitude': longitude,
    });
  }

  Future<Map<String, dynamic>> getProfile() async {
    final data = await _client.get('/driver/profile');
    return data as Map<String, dynamic>;
  }
}

/// Valid driver ride-status transitions (mirrors backend VALID_TRANSITIONS)
class RideStatusTransitions {
  static const Map<String, List<String>> allowed = {
    'UNASSIGNED':          [],
    'ASSIGNED':            ['DRIVER_ON_THE_WAY', 'CANCELLED'],
    'DRIVER_ON_THE_WAY':   ['DRIVER_ARRIVED', 'CANCELLED'],
    'DRIVER_ARRIVED':      ['PASSENGER_PICKED_UP', 'CANCELLED'],
    'PASSENGER_PICKED_UP': ['IN_TRANSIT', 'CANCELLED'],
    'IN_TRANSIT':          ['DROPPED_OFF', 'CANCELLED'],
    'DROPPED_OFF':         ['COMPLETED', 'CANCELLED'],
    'COMPLETED':           [],
    'CANCELLED':           [],
  };

  static List<String> nextStates(String current) =>
      allowed[current] ?? [];

  static List<String> nextStatuses(String current) =>
      allowed[current] ?? [];

  static String label(String status) => switch (status) {
        'UNASSIGNED'          => 'Unassigned',
        'ASSIGNED'            => 'Assigned',
        'DRIVER_ON_THE_WAY'   => 'On the Way',
        'DRIVER_ARRIVED'      => 'Arrived at Pickup',
        'PASSENGER_PICKED_UP' => 'Passenger Picked Up',
        'IN_TRANSIT'          => 'In Transit',
        'DROPPED_OFF'         => 'Dropped Off',
        'COMPLETED'           => 'Completed',
        'CANCELLED'           => 'Cancelled',
        _                     => status,
      };

  static String actionLabel(String nextStatus) => switch (nextStatus) {
        'DRIVER_ON_THE_WAY'   => 'Start Trip',
        'DRIVER_ARRIVED'      => 'Mark Arrived',
        'PASSENGER_PICKED_UP' => 'Passenger Picked Up',
        'IN_TRANSIT'          => 'Begin Transit',
        'DROPPED_OFF'         => 'Mark Dropped Off',
        'COMPLETED'           => 'Complete Ride',
        'CANCELLED'           => 'Cancel Ride',
        _                     => nextStatus,
      };
}
