import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';
import '../../widgets/qr_display_widget.dart';
import '../../widgets/ride_status_stepper.dart';

class BookingDetailsScreen extends ConsumerStatefulWidget {
  final String bookingId;
  const BookingDetailsScreen({super.key, required this.bookingId});

  @override
  ConsumerState<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends ConsumerState<BookingDetailsScreen> {
  Timer? _qrPollTimer;
  int _pollCount = 0;
  static const _maxPolls = 6;

  @override
  void initState() {
    super.initState();
    // Poll for QR code up to 6 times × 2s = 12s (matches website behavior)
    _qrPollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (_pollCount >= _maxPolls) {
        _qrPollTimer?.cancel();
        return;
      }
      _pollCount++;
      final current = ref.read(bookingDetailProvider(widget.bookingId));
      // Stop polling once QR is available
      if (current.value?.qrCodeUrl != null && current.value!.qrCodeUrl!.isNotEmpty) {
        _qrPollTimer?.cancel();
        return;
      }
      ref.invalidate(bookingDetailProvider(widget.bookingId));
    });
  }

  @override
  void dispose() {
    _qrPollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookingAsync = ref.watch(bookingDetailProvider(widget.bookingId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(bookingDetailProvider(widget.bookingId)),
          ),
        ],
      ),
      body: bookingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text('Error: $e', style: const TextStyle(color: TColors.error)),
        ),
        data: (booking) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Ref + status
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('BOOKING REFERENCE',
                              style: TextStyle(
                                  color: TColors.whiteMuted, fontSize: 10, letterSpacing: 1.5)),
                          const SizedBox(height: 4),
                          GestureDetector(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: booking.displayRef));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Copied to clipboard'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                            child: Row(
                              children: [
                                Text(booking.displayRef,
                                    style: const TextStyle(
                                        color: TColors.gold,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 1)),
                                const SizedBox(width: 6),
                                const Icon(Icons.copy_rounded, color: TColors.gold, size: 14),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    _StatusChip(status: booking.status),
                  ],
                ),

                const SizedBox(height: 24),

                // QR Code
                Center(
                  child: Column(
                    children: [
                      QrDisplayWidget(
                        qrUrl: booking.qrCodeUrl,
                        bookingRef: booking.displayRef,
                        size: 200,
                      ),
                      const SizedBox(height: 10),
                      const Text('Show this QR to your driver',
                          style: TextStyle(color: TColors.whiteMuted, fontSize: 12)),
                    ],
                  ),
                ),

                const SizedBox(height: 28),

                // Action buttons
                if (booking.status == 'CONFIRMED' || booking.status == 'DRIVER_ASSIGNED' ||
                    booking.status == 'EN_ROUTE_TO_PICKUP' || booking.status == 'ARRIVED_AT_PICKUP' ||
                    booking.status == 'IN_PROGRESS')
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: TraqqButton(
                      label: 'Live Tracking',
                      icon: Icons.location_on_rounded,
                      onPressed: () => context.push('/tracking/${widget.bookingId}'),
                    ),
                  ),

                if (booking.status == 'UNPAID')
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: TraqqButton(
                      label: 'Complete Payment',
                      icon: Icons.credit_card_rounded,
                      onPressed: () => context.push('/checkout', extra: {
                        'bookingId': booking.id,
                        'bookingRef': booking.displayRef,
                        'amountCents': (booking.totalPrice * 100).round(),
                      }),
                    ),
                  ),

                // Details grid
                _SectionHeader('Trip Details'),
                const SizedBox(height: 12),
                _DetailGrid([
                  _Detail('Date', booking.formattedPickupDatetime),
                  _Detail('Type', (() {
                    switch (booking.tripDirection) {
                      case 'FROM_DFW': return 'From DFW Airport';
                      case 'POINT_TO_POINT': return 'Point-to-Point';
                      default: return 'To DFW Airport';
                    }
                  })()),
                  if (booking.bookingType != 'AIRPORT' && booking.bookingType.isNotEmpty)
                    _Detail('Booking For', booking.bookingType.replaceAll('_', ' ')),
                  if (booking.dropoffTerminal != null && booking.dropoffTerminal!.isNotEmpty && booking.tripDirection != 'POINT_TO_POINT')
                    _Detail('Terminal', 'Terminal ${booking.dropoffTerminal}'),
                  _Detail('Passengers', '${booking.passengerCount}'),
                  if (booking.vanCount != null && booking.vanCount! > 1)
                    _Detail('Vans', '${booking.vanCount}'),
                  _Detail('Price', '\$${booking.totalPrice.toStringAsFixed(2)}'),
                ]),

                const SizedBox(height: 24),

                // Direction-aware Pickup / Drop-off
                ...() {
                  final dir = booking.tripDirection;
                  final terminal = booking.dropoffTerminal != null && booking.dropoffTerminal!.isNotEmpty
                      ? 'DFW Airport – Terminal ${booking.dropoffTerminal}'
                      : 'DFW International Airport';

                  if (dir == 'FROM_DFW') {
                    return [
                      _SectionHeader('Pickup Location'),
                      const SizedBox(height: 8),
                      _InfoBox(terminal),
                      const SizedBox(height: 24),
                      _SectionHeader('Drop-off Address'),
                      const SizedBox(height: 8),
                      _InfoBox(booking.destinationAddress ?? booking.pickupAddress),
                    ];
                  }
                  if (dir == 'POINT_TO_POINT') {
                    return [
                      _SectionHeader('Pickup Address'),
                      const SizedBox(height: 8),
                      _InfoBox(booking.pickupAddress),
                      if (booking.destinationAddress != null) ...([
                        const SizedBox(height: 24),
                        _SectionHeader('Drop-off Address'),
                        const SizedBox(height: 8),
                        _InfoBox(booking.destinationAddress!),
                      ]),
                    ];
                  }
                  // TO_DFW
                  return [
                    _SectionHeader('Pickup Address'),
                    const SizedBox(height: 8),
                    _InfoBox(booking.pickupAddress),
                    const SizedBox(height: 24),
                    _SectionHeader('Drop-off Location'),
                    const SizedBox(height: 8),
                    _InfoBox(terminal),
                  ];
                }(),

                // Driver info
                if (booking.driver != null) ...[
                  _SectionHeader('Your Driver'),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: TColors.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: TColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: TColors.goldDim,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: const Icon(Icons.person_rounded, color: TColors.gold, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(booking.driver!.name,
                                style: const TextStyle(
                                    color: TColors.white, fontSize: 15, fontWeight: FontWeight.w600)),
                            if (booking.driver!.vehicle != null)
                              Text(
                                '${booking.driver!.vehicle!.make} ${booking.driver!.vehicle!.model}'
                                ' · ${booking.driver!.vehicle!.color}',
                                style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Ride status
                _SectionHeader('Ride Status'),
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
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  Color _color() => switch (status) {
        'CONFIRMED' || 'COMPLETED' || 'PAID' => TColors.success,
        'PENDING' || 'UNPAID'               => TColors.warning,
        'CANCELLED' || 'FAILED'             => TColors.error,
        _                                   => TColors.gold,
      };

  @override
  Widget build(BuildContext context) {
    final c = _color();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: c.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: c.withOpacity(0.4)),
      ),
      child: Text(status.replaceAll('_', ' '),
          style: TextStyle(
              color: c, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(),
      style: const TextStyle(
          color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2));
}

class _InfoBox extends StatelessWidget {
  final String text;
  const _InfoBox(this.text);
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: TColors.border),
        ),
        child: Text(text, style: const TextStyle(color: TColors.white, fontSize: 14)),
      );
}

class _Detail {
  final String label;
  final String value;
  const _Detail(this.label, this.value);
}

class _DetailGrid extends StatelessWidget {
  final List<_Detail> details;
  const _DetailGrid(this.details);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TColors.border),
      ),
      child: Column(
        children: List.generate(details.length, (i) {
          final d = details[i];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                child: Row(
                  children: [
                    Text(d.label, style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                    const Spacer(),
                    Text(d.value,
                        style: const TextStyle(
                            color: TColors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              if (i < details.length - 1) const Divider(color: TColors.border, height: 1),
            ],
          );
        }),
      ),
    );
  }
}
