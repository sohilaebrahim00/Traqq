import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';
import '../../widgets/ride_status_stepper.dart';
import '../../../data/datasources/driver_remote_datasource.dart';

class DriverBookingDetailsScreen extends ConsumerWidget {
  final String bookingId;

  const DriverBookingDetailsScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingAsync = ref.watch(bookingDetailProvider(bookingId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(bookingDetailProvider(bookingId)),
          ),
        ],
      ),
      body: bookingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text('Error: $e', style: const TextStyle(color: TColors.error)),
        ),
        data: (booking) {
          final nextStatuses = RideStatusTransitions.nextStatuses(booking.status);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Ref + status
                Row(
                  children: [
                    Expanded(
                      child: Text(booking.displayRef,
                          style: const TextStyle(
                              color: TColors.gold,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: TColors.gold.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: TColors.gold.withOpacity(0.4)),
                      ),
                      child: Text(
                        booking.status.replaceAll('_', ' '),
                        style: const TextStyle(
                            color: TColors.gold, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Status update buttons
                if (nextStatuses.isNotEmpty) ...[
                  _SectionLabel('UPDATE STATUS'),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: nextStatuses
                        .map((s) => _StatusButton(
                              status: s,
                              bookingId: bookingId,
                              onDone: () =>
                                  ref.invalidate(bookingDetailProvider(bookingId)),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 20),
                ],

                // Navigation button
                if (booking.pickupAddress.isNotEmpty) ...[
                  TraqqButton(
                    label: 'Navigate to Pickup',
                    icon: Icons.navigation_rounded,
                    isOutlined: true,
                    onPressed: () => _openMaps(booking.pickupAddress),
                  ),
                  const SizedBox(height: 20),
                ],

                // Trip details
                _SectionLabel('TRIP DETAILS'),
                const SizedBox(height: 10),
                _DetailCard([
                  _Row('Date & Time', booking.formattedPickupDatetime),
                  _Row('Direction', (() {
                    switch (booking.tripDirection) {
                      case 'FROM_DFW': return 'From DFW Airport';
                      case 'POINT_TO_POINT': return 'Point-to-Point';
                      default: return 'To DFW Airport';
                    }
                  })()),
                  if (booking.bookingType != 'AIRPORT' && booking.bookingType.isNotEmpty)
                    _Row('Category', booking.bookingType.replaceAll('_', ' ')),
                  if (booking.dropoffTerminal != null && booking.dropoffTerminal!.isNotEmpty && booking.tripDirection != 'POINT_TO_POINT')
                    _Row('Terminal', 'Terminal ${booking.dropoffTerminal}'),
                  _Row('Passengers', '${booking.passengerCount}'),
                  _Row('Vans', '${booking.vanCount}'),
                ]),

                const SizedBox(height: 20),
                _SectionLabel(booking.tripDirection == 'FROM_DFW' ? 'DROP-OFF ADDRESS' : 'PICKUP ADDRESS'),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: TColors.bgCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: TColors.border),
                  ),
                  child: Text(booking.pickupAddress,
                      style: const TextStyle(color: TColors.white, fontSize: 14)),
                ),

                if (booking.destinationAddress != null && booking.destinationAddress!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionLabel('DESTINATION / DROP-OFF ADDRESS'),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: TColors.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: TColors.border),
                    ),
                    child: Text(booking.destinationAddress!,
                        style: const TextStyle(color: TColors.white, fontSize: 14)),
                  ),
                ],

                // Driver Notes / Venue Info
                if (booking.notes != null && booking.notes!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionLabel('DRIVER NOTES'),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: TColors.gold.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: TColors.gold.withOpacity(0.3)),
                    ),
                    child: Text(booking.notes!,
                        style: const TextStyle(color: TColors.gold, fontSize: 14)),
                  ),
                ],

                // Luggage / airline info
                if (booking.airline != null || booking.departureTime != null) ...[
                  const SizedBox(height: 20),
                  _SectionLabel(booking.tripDirection == 'POINT_TO_POINT' ? 'VENUE DETAILS' : 'FLIGHT INFO'),
                  const SizedBox(height: 10),
                  _DetailCard([
                    if (booking.airline != null) _Row(booking.tripDirection == 'POINT_TO_POINT' ? 'Venue / Event' : 'Airline', booking.airline!),
                    if (booking.departureTime != null) _Row('Time', booking.departureTime!),
                  ]),
                ],

                // Customer contact
                if (booking.email != null) ...[
                  const SizedBox(height: 20),
                  _SectionLabel('CUSTOMER'),
                  const SizedBox(height: 10),
                  _DetailCard([
                    if (booking.email != null) _Row('Email', booking.email!),
                  ]),
                ],

                const SizedBox(height: 24),
                _SectionLabel('RIDE PROGRESS'),
                const SizedBox(height: 16),
                RideStatusStepper(currentStatus: booking.status),
                const SizedBox(height: 48),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openMaps(String address) async {
    final encoded = Uri.encodeComponent(address);
    final gmaps = Uri.parse('https://www.google.com/maps/search/?api=1&query=$encoded');
    if (await canLaunchUrl(gmaps)) await launchUrl(gmaps);
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: const TextStyle(
            color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2));
  }
}

class _Row {
  final String label;
  final String value;
  const _Row(this.label, this.value);
}

class _DetailCard extends StatelessWidget {
  final List<_Row> rows;
  const _DetailCard(this.rows);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TColors.border),
      ),
      child: Column(
        children: List.generate(rows.length, (i) {
          final r = rows[i];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                child: Row(
                  children: [
                    Text(r.label,
                        style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                    const Spacer(),
                    Flexible(
                      child: Text(r.value,
                          style: const TextStyle(
                              color: TColors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600),
                          textAlign: TextAlign.right),
                    ),
                  ],
                ),
              ),
              if (i < rows.length - 1) const Divider(color: TColors.border, height: 1),
            ],
          );
        }),
      ),
    );
  }
}

class _StatusButton extends ConsumerStatefulWidget {
  final String status;
  final String bookingId;
  final VoidCallback onDone;

  const _StatusButton({
    required this.status,
    required this.bookingId,
    required this.onDone,
  });

  @override
  ConsumerState<_StatusButton> createState() => _StatusButtonState();
}

class _StatusButtonState extends ConsumerState<_StatusButton> {
  bool _loading = false;

  String _label() => switch (widget.status) {
        'EN_ROUTE_TO_PICKUP' => 'En Route',
        'ARRIVED_AT_PICKUP'  => 'Arrived',
        'IN_PROGRESS'        => 'Start Ride',
        'COMPLETED'          => 'Complete',
        'CANCELLED'          => 'Cancel',
        _                    => widget.status.replaceAll('_', ' '),
      };

  Color _color() => switch (widget.status) {
        'COMPLETED'  => TColors.success,
        'CANCELLED'  => TColors.error,
        'IN_PROGRESS' => TColors.gold,
        _            => TColors.white,
      };

  Future<void> _tap() async {
    if (widget.status == 'CANCELLED') {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: TColors.bgCard,
          title: const Text('Cancel Ride?', style: TextStyle(color: TColors.white)),
          content: const Text('Are you sure you want to cancel this ride?',
              style: TextStyle(color: TColors.whiteMuted)),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('No', style: TextStyle(color: TColors.whiteMuted))),
            TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Yes, Cancel', style: TextStyle(color: TColors.error))),
          ],
        ),
      );
      if (confirm != true) return;
    }

    setState(() => _loading = true);
    try {
      final ds = ref.read(driverDataSourceProvider);
      await ds.updateRideStatus(widget.bookingId, widget.status);
      widget.onDone();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _color();
    return ElevatedButton(
      onPressed: _loading ? null : _tap,
      style: ElevatedButton.styleFrom(
        backgroundColor: c.withOpacity(0.15),
        foregroundColor: c,
        side: BorderSide(color: c.withOpacity(0.5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: _loading
          ? SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 1.5, color: c),
            )
          : Text(_label(), style: TextStyle(color: c, fontSize: 13, fontWeight: FontWeight.w600)),
    );
  }
}
