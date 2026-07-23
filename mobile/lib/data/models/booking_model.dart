class BookingModel {
  final String id;
  final String bookingRef;
  final DateTime pickupDate;
  final String pickupTime;
  final String pickupAddress;
  final double? pickupLatitude;
  final double? pickupLongitude;
  final String? destinationAddress;
  final int passengerCount;
  final int carryOnCount;
  final int checkedLuggageCount;
  final int vanCount;
  final String tripDirection;
  final String bookingType;
  final String dropoffTerminal;
  final String? airline;
  final String? departureTime;
  final String? notes;
  final String phoneNumber;
  final String? email;
  final String bookingStatus;
  final String rideStatus;
  final String paymentStatus;
  final double price;
  final String? promoCode;
  final double discountAmount;
  final String? qrCode;
  final bool? hasQrCode;
  final DateTime createdAt;
  final DriverInfoModel? driver;

  const BookingModel({
    required this.id,
    required this.bookingRef,
    required this.pickupDate,
    required this.pickupTime,
    required this.pickupAddress,
    this.pickupLatitude,
    this.pickupLongitude,
    this.destinationAddress,
    required this.passengerCount,
    required this.carryOnCount,
    required this.checkedLuggageCount,
    required this.vanCount,
    required this.tripDirection,
    this.bookingType = 'AIRPORT',
    this.dropoffTerminal,
    this.airline,
    this.departureTime,
    this.notes,
    required this.phoneNumber,
    this.email,
    required this.bookingStatus,
    required this.rideStatus,
    required this.paymentStatus,
    required this.price,
    this.promoCode,
    required this.discountAmount,
    this.qrCode,
    this.hasQrCode,
    required this.createdAt,
    this.driver,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) => BookingModel(
        id: json['id'] as String,
        bookingRef: json['bookingRef'] as String? ?? '',
        pickupDate: DateTime.tryParse(json['pickupDate'] as String? ?? '') ??
            DateTime.now(),
        pickupTime: json['pickupTime'] as String? ?? '',
        pickupAddress: json['pickupAddress'] as String? ?? '',
        pickupLatitude: (json['pickupLatitude'] as num?)?.toDouble(),
        pickupLongitude: (json['pickupLongitude'] as num?)?.toDouble(),
        destinationAddress: json['destinationAddress'] as String?,
        passengerCount: json['passengerCount'] as int? ?? 1,
        carryOnCount: json['carryOnCount'] as int? ?? 0,
        checkedLuggageCount: json['checkedLuggageCount'] as int? ?? 0,
        vanCount: json['vanCount'] as int? ?? 1,
        tripDirection: json['tripDirection'] as String? ?? 'TO_DFW',
        bookingType: json['bookingType'] as String? ?? 'AIRPORT',
        dropoffTerminal: json['dropoffTerminal'] as String?,
        airline: json['airline'] as String?,
        departureTime: json['departureTime'] as String?,
        notes: json['notes'] as String?,
        phoneNumber: json['phoneNumber'] as String? ?? '',
        email: json['email'] as String?,
        bookingStatus: json['bookingStatus'] as String? ?? 'PENDING',
        rideStatus: json['rideStatus'] as String? ?? 'UNASSIGNED',
        paymentStatus: json['paymentStatus'] as String? ?? 'UNPAID',
        price: (json['price'] as num?)?.toDouble() ?? 99.0,
        promoCode: json['promoCode'] as String?,
        discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? 0.0,
        qrCode: json['qrCode'] as String?,
        hasQrCode: json['hasQrCode'] as bool?,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
        driver: json['driver'] != null
            ? DriverInfoModel.fromJson(json['driver'] as Map<String, dynamic>)
            : null,
      );

  bool get isPaid => paymentStatus == 'PAID';
  bool get isConfirmed => bookingStatus == 'CONFIRMED';
  bool get isCancelled => bookingStatus == 'CANCELLED';
  bool get isCompleted => bookingStatus == 'COMPLETED';
  bool get isPending => bookingStatus == 'PENDING';

  bool get hasQr => qrCode != null && qrCode!.isNotEmpty;

  String get displayRef => bookingRef.startsWith('TRQ-')
      ? bookingRef
      : 'TRQ-$bookingRef';

  double get totalPrice => price - discountAmount;

  /// Synthesized combined status for UI (mirrors RideStatusStepper steps).
  String get status {
    if (bookingStatus == 'CANCELLED') return 'CANCELLED';
    if (bookingStatus == 'COMPLETED') return 'COMPLETED';
    if (paymentStatus == 'UNPAID' && bookingStatus == 'PENDING') return 'UNPAID';
    if (rideStatus == 'DRIVER_ASSIGNED') return 'DRIVER_ASSIGNED';
    if (rideStatus == 'EN_ROUTE_TO_PICKUP') return 'EN_ROUTE_TO_PICKUP';
    if (rideStatus == 'ARRIVED_AT_PICKUP') return 'ARRIVED_AT_PICKUP';
    if (rideStatus == 'IN_PROGRESS') return 'IN_PROGRESS';
    if (bookingStatus == 'CONFIRMED') return 'CONFIRMED';
    return bookingStatus;
  }

  String get formattedPickupDatetime {
    final d = pickupDate;
    final t = pickupTime;
    return '${d.month}/${d.day}/${d.year} · $t';
  }

  String? get qrCodeUrl => qrCode;
}

class DriverInfoModel {
  final String fullName;
  final String? phoneNumber;
  final String? profilePhoto;
  final VehicleInfoModel? vehicle;
  final LocationModel? location;

  const DriverInfoModel({
    required this.fullName,
    this.phoneNumber,
    this.profilePhoto,
    this.vehicle,
    this.location,
  });

  String get name => fullName;

  factory DriverInfoModel.fromJson(Map<String, dynamic> json) =>
      DriverInfoModel(
        fullName: json['fullName'] as String? ?? 'Driver',
        phoneNumber: json['phoneNumber'] as String?,
        profilePhoto: json['profilePhoto'] as String?,
        vehicle: json['vehicle'] != null
            ? VehicleInfoModel.fromJson(json['vehicle'] as Map<String, dynamic>)
            : null,
        location: json['location'] != null
            ? LocationModel.fromJson(json['location'] as Map<String, dynamic>)
            : null,
      );
}

class VehicleInfoModel {
  final String make;
  final String model;
  final String color;
  final String plate;
  final int? year;

  const VehicleInfoModel({
    required this.make,
    required this.model,
    required this.color,
    required this.plate,
    this.year,
  });

  String get licensePlate => plate;

  factory VehicleInfoModel.fromJson(Map<String, dynamic> json) =>
      VehicleInfoModel(
        make: json['make'] as String? ?? '',
        model: json['model'] as String? ?? '',
        color: json['color'] as String? ?? '',
        plate: json['plate'] as String? ?? json['licensePlate'] as String? ?? '',
        year: json['year'] as int?,
      );

  String get description => '$color $make $model';
}

class LocationModel {
  final double? latitude;
  final double? longitude;
  final DateTime? updatedAt;

  const LocationModel({this.latitude, this.longitude, this.updatedAt});

  factory LocationModel.fromJson(Map<String, dynamic> json) => LocationModel(
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        updatedAt: json['updatedAt'] != null
            ? DateTime.tryParse(json['updatedAt'] as String)
            : null,
      );
}

class AvailabilityModel {
  final List<String> unavailableSlots;
  final Map<String, SlotDetailModel> slotDetails;

  const AvailabilityModel({
    required this.unavailableSlots,
    required this.slotDetails,
  });

  factory AvailabilityModel.fromJson(Map<String, dynamic> json) {
    final details = <String, SlotDetailModel>{};
    if (json['slotDetails'] is Map) {
      (json['slotDetails'] as Map).forEach((k, v) {
        if (v is Map) {
          details[k.toString()] = SlotDetailModel.fromJson(v as Map<String, dynamic>);
        }
      });
    }
    return AvailabilityModel(
      unavailableSlots: (json['unavailableSlots'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      slotDetails: details,
    );
  }

  bool isSlotAvailable(String slot) => !unavailableSlots.contains(slot);
  int remainingVans(String slot) => slotDetails[slot]?.remaining ?? 3;
}

class SlotDetailModel {
  final int used;
  final int remaining;
  final bool within24h;
  final bool available;

  const SlotDetailModel({
    required this.used,
    required this.remaining,
    required this.within24h,
    required this.available,
  });

  factory SlotDetailModel.fromJson(Map<String, dynamic> json) =>
      SlotDetailModel(
        used: json['used'] as int? ?? 0,
        remaining: json['remaining'] as int? ?? 3,
        within24h: json['within24h'] as bool? ?? false,
        available: json['available'] as bool? ?? true,
      );
}

class TrackingEvent {
  final String status;
  final DateTime? timestamp;
  const TrackingEvent({required this.status, this.timestamp});
}

class TrackingModel {
  final String bookingRef;
  final DateTime pickupDate;
  final String pickupTime;
  final String pickupAddress;
  final String tripDirection;
  final String dropoffTerminal;
  final String bookingStatus;
  final String rideStatus;
  final String paymentStatus;
  final TrackingTimelineModel rawTimeline;
  final String? eta;
  final DriverInfoModel? driver;

  const TrackingModel({
    required this.bookingRef,
    required this.pickupDate,
    required this.pickupTime,
    required this.pickupAddress,
    required this.tripDirection,
    required this.dropoffTerminal,
    required this.bookingStatus,
    required this.rideStatus,
    required this.paymentStatus,
    required this.rawTimeline,
    this.eta,
    this.driver,
  });

  String get status {
    if (bookingStatus == 'CANCELLED') return 'CANCELLED';
    if (bookingStatus == 'COMPLETED') return 'COMPLETED';
    if (rideStatus == 'DRIVER_ASSIGNED') return 'DRIVER_ASSIGNED';
    if (rideStatus == 'EN_ROUTE_TO_PICKUP') return 'EN_ROUTE_TO_PICKUP';
    if (rideStatus == 'ARRIVED_AT_PICKUP') return 'ARRIVED_AT_PICKUP';
    if (rideStatus == 'IN_PROGRESS') return 'IN_PROGRESS';
    if (bookingStatus == 'CONFIRMED') return 'CONFIRMED';
    return bookingStatus;
  }

  String? get estimatedArrival => eta;
  LocationModel? get driverLocation => driver?.location;

  List<TrackingEvent> get timeline {
    final events = <TrackingEvent>[];
    final tl = rawTimeline;
    if (tl.createdAt != null) events.add(TrackingEvent(status: 'PENDING', timestamp: tl.createdAt));
    if (tl.assignedAt != null) events.add(TrackingEvent(status: 'DRIVER_ASSIGNED', timestamp: tl.assignedAt));
    if (tl.driverStartedAt != null) events.add(TrackingEvent(status: 'EN_ROUTE_TO_PICKUP', timestamp: tl.driverStartedAt));
    if (tl.driverArrivedAt != null) events.add(TrackingEvent(status: 'ARRIVED_AT_PICKUP', timestamp: tl.driverArrivedAt));
    if (tl.passengerPickedUpAt != null) events.add(TrackingEvent(status: 'IN_PROGRESS', timestamp: tl.passengerPickedUpAt));
    if (tl.completedAt != null) events.add(TrackingEvent(status: 'COMPLETED', timestamp: tl.completedAt));
    return events;
  }

  factory TrackingModel.fromJson(Map<String, dynamic> json) => TrackingModel(
        bookingRef: json['bookingRef'] as String? ?? '',
        pickupDate: DateTime.tryParse(json['pickupDate'] as String? ?? '') ??
            DateTime.now(),
        pickupTime: json['pickupTime'] as String? ?? '',
        pickupAddress: json['pickupAddress'] as String? ?? '',
        tripDirection: json['tripDirection'] as String? ?? 'TO_DFW',
        dropoffTerminal: json['dropoffTerminal'] as String? ?? '',
        bookingStatus: json['bookingStatus'] as String? ?? 'PENDING',
        rideStatus: json['rideStatus'] as String? ?? 'UNASSIGNED',
        paymentStatus: json['paymentStatus'] as String? ?? 'UNPAID',
        rawTimeline: TrackingTimelineModel.fromJson(
          json['timeline'] as Map<String, dynamic>? ?? {},
        ),
        eta: json['eta'] as String?,
        driver: json['driver'] != null
            ? DriverInfoModel.fromJson(json['driver'] as Map<String, dynamic>)
            : null,
      );
}

class TrackingTimelineModel {
  final DateTime? createdAt;
  final DateTime? assignedAt;
  final DateTime? driverStartedAt;
  final DateTime? driverArrivedAt;
  final DateTime? passengerPickedUpAt;
  final DateTime? completedAt;

  const TrackingTimelineModel({
    this.createdAt,
    this.assignedAt,
    this.driverStartedAt,
    this.driverArrivedAt,
    this.passengerPickedUpAt,
    this.completedAt,
  });

  factory TrackingTimelineModel.fromJson(Map<String, dynamic> json) =>
      TrackingTimelineModel(
        createdAt: _dt(json['createdAt']),
        assignedAt: _dt(json['assignedAt']),
        driverStartedAt: _dt(json['driverStartedAt']),
        driverArrivedAt: _dt(json['driverArrivedAt']),
        passengerPickedUpAt: _dt(json['passengerPickedUpAt']),
        completedAt: _dt(json['completedAt']),
      );

  static DateTime? _dt(dynamic v) =>
      v != null ? DateTime.tryParse(v.toString()) : null;
}
