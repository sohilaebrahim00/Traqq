import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';
import '../../../data/models/booking_model.dart';
import '../../../core/config/app_config.dart';

class DriverDashboardScreen extends ConsumerStatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  ConsumerState<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends ConsumerState<DriverDashboardScreen> {
  Timer? _locationTimer;
  bool _trackingActive = false;

  @override
  void initState() {
    super.initState();
    _startLocationUpdates();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _startLocationUpdates() async {
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      final req = await Geolocator.requestPermission();
      if (req == LocationPermission.denied || req == LocationPermission.deniedForever) return;
    }

    setState(() => _trackingActive = true);
    _locationTimer = Timer.periodic(
      Duration(seconds: AppConfig.locationUpdateIntervalSeconds),
      (_) => _pushLocation(),
    );
    _pushLocation(); // immediate first push
  }

  Future<void> _pushLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final ds = ref.read(driverDataSourceProvider);
      await ds.updateLocation(pos.latitude, pos.longitude);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final bookingsAsync = ref.watch(driverAssignedBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Driver Dashboard',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            if (auth.user != null)
              Text(auth.user!.fullName,
                  style: const TextStyle(color: TColors.whiteMuted, fontSize: 11)),
          ],
        ),
        actions: [
          // Location pulse indicator
          if (_trackingActive)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _PulseIndicator(),
            ),
          IconButton(
            icon: const Icon(Icons.person_rounded),
            onPressed: () => context.push('/driver/profile'),
          ),
        ],
      ),
      body: bookingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded, color: TColors.error, size: 48),
                const SizedBox(height: 16),
                Text(e.toString().replaceAll('Exception: ', ''),
                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
                    textAlign: TextAlign.center),
                const SizedBox(height: 20),
                TraqqButton(
                  label: 'Retry',
                  isOutlined: true,
                  onPressed: () => ref.invalidate(driverAssignedBookingsProvider),
                ),
              ],
            ),
          ),
        ),
        data: (bookings) {
          // Split into active vs upcoming
          final active = bookings.where((b) {
            return ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS']
                .contains(b.status);
          }).toList();
          final upcoming = bookings.where((b) {
            return ['CONFIRMED', 'DRIVER_ASSIGNED'].contains(b.status);
          }).toList();

          if (bookings.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.directions_car_outlined,
                        color: TColors.whiteFaint, size: 64),
                    const SizedBox(height: 20),
                    const Text('No assigned bookings',
                        style: TextStyle(
                            color: TColors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text('You have no rides assigned yet.',
                        style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(driverAssignedBookingsProvider),
            color: TColors.gold,
            backgroundColor: TColors.bgCard,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (active.isNotEmpty) ...[
                  _SectionHeader('Active Ride'),
                  const SizedBox(height: 10),
                  ...active.map((b) => _DriverBookingCard(booking: b)),
                  const SizedBox(height: 20),
                ],
                if (upcoming.isNotEmpty) ...[
                  _SectionHeader('Upcoming'),
                  const SizedBox(height: 10),
                  ...upcoming.map((b) => _DriverBookingCard(booking: b)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(),
        style: const TextStyle(
            color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2));
  }
}

class _DriverBookingCard extends StatelessWidget {
  final BookingModel booking;

  const _DriverBookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/driver/booking-details/${booking.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: booking.status == 'IN_PROGRESS' ? TColors.gold : TColors.border,
            width: booking.status == 'IN_PROGRESS' ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(booking.displayRef,
                    style: const TextStyle(
                        color: TColors.gold,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5)),
                const Spacer(),
                _StatusChip(booking.status),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.schedule_rounded, color: TColors.whiteMuted, size: 14),
                const SizedBox(width: 6),
                Text(booking.formattedPickupDatetime,
                    style: const TextStyle(color: TColors.white, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on_rounded, color: TColors.whiteMuted, size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(booking.pickupAddress,
                      style: const TextStyle(color: TColors.whiteMuted, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.people_rounded, color: TColors.whiteMuted, size: 14),
                const SizedBox(width: 4),
                Text('${booking.passengerCount} pax',
                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 12)),
                if (booking.dropoffTerminal != null && booking.dropoffTerminal!.isNotEmpty && booking.tripDirection != 'POINT_TO_POINT') ...[
                  const SizedBox(width: 14),
                  const Icon(Icons.flight_rounded, color: TColors.whiteMuted, size: 14),
                  const SizedBox(width: 4),
                  Text('Terminal ${booking.dropoffTerminal}',
                      style: const TextStyle(color: TColors.whiteMuted, fontSize: 12)),
                ] else if (booking.tripDirection == 'POINT_TO_POINT') ...[
                  const SizedBox(width: 14),
                  const Icon(Icons.alt_route_rounded, color: TColors.whiteMuted, size: 14),
                  const SizedBox(width: 4),
                  Text(booking.bookingType != 'AIRPORT' ? booking.bookingType.replaceAll('_', ' ') : 'P2P',
                      style: const TextStyle(color: TColors.gold, fontSize: 12)),
                ],
                const Spacer(),
                const Icon(Icons.chevron_right, color: TColors.whiteFaint, size: 18),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip(this.status);

  Color _color() => switch (status) {
        'IN_PROGRESS' || 'ARRIVED_AT_PICKUP' => TColors.gold,
        'EN_ROUTE_TO_PICKUP'                 => TColors.warning,
        'CONFIRMED' || 'DRIVER_ASSIGNED'     => TColors.success,
        _                                    => TColors.whiteMuted,
      };

  @override
  Widget build(BuildContext context) {
    final c = _color();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: c.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: c.withOpacity(0.4)),
      ),
      child: Text(status.replaceAll('_', ' '),
          style: TextStyle(
              color: c, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }
}

class _PulseIndicator extends StatefulWidget {
  @override
  State<_PulseIndicator> createState() => _PulseIndicatorState();
}

class _PulseIndicatorState extends State<_PulseIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(color: TColors.success, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          const Text('GPS', style: TextStyle(color: TColors.success, fontSize: 10)),
        ],
      ),
    );
  }
}
