import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ride_status_stepper.dart';
import '../../widgets/traqq_button.dart';
import '../../../data/models/booking_model.dart'
    show DriverInfoModel, LocationModel, TrackingEvent;

class BookingTrackingScreen extends ConsumerStatefulWidget {
  final String bookingId;
  const BookingTrackingScreen({super.key, required this.bookingId});

  @override
  ConsumerState<BookingTrackingScreen> createState() =>
      _BookingTrackingScreenState();
}

class _BookingTrackingScreenState extends ConsumerState<BookingTrackingScreen> {
  Timer? _pollTimer;
  final MapController _mapController = MapController();
  LatLng? _lastDriverPos;

  @override
  void initState() {
    super.initState();
    // Poll every 12 seconds — matches website behavior
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted) ref.invalidate(trackingProvider(widget.bookingId));
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  void _animateToDriver(LatLng pos) {
    try {
      _mapController.move(pos, 14.0);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final trackingAsync = ref.watch(trackingProvider(widget.bookingId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Tracking'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(trackingProvider(widget.bookingId)),
          ),
        ],
      ),
      body: trackingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded,
                    color: TColors.error, size: 48),
                const SizedBox(height: 16),
                Text(
                    e.toString().replaceAll('Exception: ', ''),
                    style: const TextStyle(
                        color: TColors.whiteMuted, fontSize: 13),
                    textAlign: TextAlign.center),
                const SizedBox(height: 24),
                TraqqButton(
                    label: 'Retry',
                    isOutlined: true,
                    onPressed: () =>
                        ref.invalidate(trackingProvider(widget.bookingId))),
              ],
            ),
          ),
        ),
        data: (tracking) {
          // Update map position when driver location changes
          if (tracking.driverLocation != null) {
            final lat = (tracking.driverLocation!.latitude as double?) ?? 0.0;
            final lng = (tracking.driverLocation!.longitude as double?) ?? 0.0;
            if (lat != 0 && lng != 0) {
              final pos = LatLng(lat, lng);
              if (_lastDriverPos != pos) {
                _lastDriverPos = pos;
                // Animate map to new driver position after frame
                WidgetsBinding.instance
                    .addPostFrameCallback((_) => _animateToDriver(pos));
              }
            }
          }

          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(trackingProvider(widget.bookingId)),
            color: TColors.gold,
            backgroundColor: TColors.bgCard,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status banner
                  _StatusBanner(status: tracking.status),
                  const SizedBox(height: 20),

                  // Embedded map
                  _EmbeddedMap(
                    location: tracking.driverLocation,
                    mapController: _mapController,
                  ),
                  const SizedBox(height: 20),

                  // Driver card
                  if (tracking.driver != null) ...[
                    _DriverCard(driver: tracking.driver!),
                    const SizedBox(height: 20),
                  ],

                  // ETA
                  if (tracking.estimatedArrival != null) ...[
                    _ETACard(eta: tracking.estimatedArrival!),
                    const SizedBox(height: 20),
                  ],

                  // Ride progress
                  _SectionLabel('RIDE PROGRESS'),
                  const SizedBox(height: 16),
                  RideStatusStepper(currentStatus: tracking.status),

                  // Timeline
                  if (tracking.timeline.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    _SectionLabel('TIMELINE'),
                    const SizedBox(height: 12),
                    ...tracking.timeline.map((e) => _TimelineEvent(event: e)),
                  ],

                  const SizedBox(height: 32),
                  TraqqButton(
                    label: 'Booking Details',
                    isOutlined: true,
                    onPressed: () =>
                        context.push('/booking-details/${widget.bookingId}'),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Embedded Map ────────────────────────────────────────────────────────────

class _EmbeddedMap extends StatelessWidget {
  final LocationModel? location;
  final MapController mapController;

  const _EmbeddedMap({required this.location, required this.mapController});

  @override
  Widget build(BuildContext context) {
    final lat = (location?.latitude as double?);
    final lng = (location?.longitude as double?);
    final hasPosition = lat != null && lng != null && lat != 0 && lng != 0;
    final center = hasPosition ? LatLng(lat!, lng!) : LatLng(32.8998, -97.0403);

    return Container(
      height: 260,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TColors.border),
      ),
      child: Stack(
        children: [
          FlutterMap(
            mapController: mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: hasPosition ? 14.0 : 11.0,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              // CartoDB dark matter tiles — matches website style
              TileLayer(
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.traqq.app',
                maxZoom: 19,
              ),
              if (hasPosition)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: center,
                      width: 44,
                      height: 44,
                      child: _DriverMarker(),
                    ),
                  ],
                ),
            ],
          ),

          // No-driver empty state
          if (!hasPosition)
            Container(
              color: const Color(0x88000000),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.directions_car_rounded,
                        color: TColors.whiteFaint, size: 36),
                    SizedBox(height: 8),
                    Text('Waiting for driver location...',
                        style: TextStyle(
                            color: TColors.whiteMuted, fontSize: 13)),
                  ],
                ),
              ),
            ),

          // Open in Google Maps button (top-right overlay)
          if (hasPosition)
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () {
                  final url =
                      'https://www.google.com/maps?q=${lat},${lng}';
                  launchUrl(Uri.parse(url),
                      mode: LaunchMode.externalApplication);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: TColors.bgCard.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(8),
                    border:
                        Border.all(color: TColors.gold.withValues(alpha: 0.6)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.open_in_new_rounded,
                          color: TColors.gold, size: 12),
                      SizedBox(width: 4),
                      Text('Open Maps',
                          style: TextStyle(
                              color: TColors.gold,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DriverMarker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Pulsing ring
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: TColors.gold.withValues(alpha: 0.2),
            shape: BoxShape.circle,
            border:
                Border.all(color: TColors.gold.withValues(alpha: 0.5), width: 2),
          ),
        ),
        // Car icon circle
        Container(
          width: 28,
          height: 28,
          decoration: const BoxDecoration(
            color: TColors.gold,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.directions_car_rounded,
              color: Colors.black, size: 16),
        ),
      ],
    );
  }
}

// ── Supporting widgets ───────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          color: TColors.gold,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 2));
}

class _StatusBanner extends StatelessWidget {
  final String status;
  const _StatusBanner({required this.status});

  String _label() => switch (status) {
        'PENDING' => 'Waiting for confirmation',
        'CONFIRMED' => 'Booking confirmed',
        'DRIVER_ASSIGNED' => 'Driver assigned',
        'EN_ROUTE_TO_PICKUP' => 'Driver is on the way',
        'ARRIVED_AT_PICKUP' => 'Driver has arrived',
        'IN_PROGRESS' => 'Ride in progress',
        'COMPLETED' => 'Ride completed',
        _ => status.replaceAll('_', ' '),
      };

  Color _color() => switch (status) {
        'IN_PROGRESS' ||
        'EN_ROUTE_TO_PICKUP' ||
        'ARRIVED_AT_PICKUP' =>
          TColors.gold,
        'COMPLETED' || 'CONFIRMED' => TColors.success,
        'CANCELLED' => TColors.error,
        _ => TColors.whiteMuted,
      };

  @override
  Widget build(BuildContext context) {
    final c = _color();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(_label(),
              style: TextStyle(
                  color: c, fontSize: 15, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _DriverCard extends StatelessWidget {
  final DriverInfoModel driver;
  const _DriverCard({required this.driver});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: TColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
                color: TColors.goldDim,
                borderRadius: BorderRadius.circular(26)),
            child:
                const Icon(Icons.person_rounded, color: TColors.gold, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(driver.fullName,
                    style: const TextStyle(
                        color: TColors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600)),
                const Text('Professional Chauffeur',
                    style:
                        TextStyle(color: TColors.whiteMuted, fontSize: 12)),
                if (driver.vehicle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${driver.vehicle!.color} ${driver.vehicle!.make} ${driver.vehicle!.model}',
                    style: const TextStyle(
                        color: TColors.whiteMuted, fontSize: 13),
                  ),
                  if (driver.vehicle!.plate.isNotEmpty)
                    Text(driver.vehicle!.plate,
                        style: const TextStyle(
                            color: TColors.gold,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                ],
              ],
            ),
          ),
          if (driver.phoneNumber != null && driver.phoneNumber!.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.phone_rounded, color: TColors.gold),
              onPressed: () =>
                  launchUrl(Uri.parse('tel:${driver.phoneNumber}')),
            ),
        ],
      ),
    );
  }
}

class _ETACard extends StatelessWidget {
  final String eta;
  const _ETACard({required this.eta});

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: TColors.goldDim,
          borderRadius: BorderRadius.circular(10),
          border:
              Border.all(color: TColors.gold.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.schedule_rounded,
                color: TColors.gold, size: 18),
            const SizedBox(width: 10),
            const Text('ETA:',
                style: TextStyle(color: TColors.gold, fontSize: 14)),
            const SizedBox(width: 6),
            Text(eta,
                style: const TextStyle(
                    color: TColors.gold,
                    fontSize: 14,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );
}

class _TimelineEvent extends StatelessWidget {
  final TrackingEvent event;
  const _TimelineEvent({required this.event});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 5, right: 10),
              decoration: const BoxDecoration(
                  color: TColors.gold, shape: BoxShape.circle),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.status.replaceAll('_', ' '),
                      style: const TextStyle(
                          color: TColors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  if (event.timestamp != null)
                    Text(
                      '${event.timestamp!.month}/${event.timestamp!.day} '
                      '${event.timestamp!.hour.toString().padLeft(2, '0')}:'
                      '${event.timestamp!.minute.toString().padLeft(2, '0')}',
                      style: const TextStyle(
                          color: TColors.whiteFaint, fontSize: 11),
                    ),
                ],
              ),
            ),
          ],
        ),
      );
}
