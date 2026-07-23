import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import 'traqq_button.dart';
import '../../data/models/booking_model.dart';
import '../../core/utils/app_date_utils.dart';

class BookingCard extends StatelessWidget {
  final BookingModel booking;
  final bool showActions;

  const BookingCard({super.key, required this.booking, this.showActions = true});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/booking-details/${booking.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: ref + status
            Row(
              children: [
                Expanded(
                  child: Text(
                    booking.displayRef,
                    style: const TextStyle(
                        color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                  ),
                ),
                StatusBadge(status: booking.status),
              ],
            ),
            const SizedBox(height: 12),

            // Date + time
            Row(
              children: [
                const Icon(Icons.schedule_rounded, color: TColors.whiteMuted, size: 15),
                const SizedBox(width: 6),
                Text(
                  booking.formattedPickupDatetime,
                  style: const TextStyle(color: TColors.white, fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Direction indicator
            Row(
              children: [
                Icon(
                  booking.tripDirection == 'TO_DFW'
                      ? Icons.flight_takeoff_rounded
                      : Icons.flight_land_rounded,
                  color: TColors.whiteMuted,
                  size: 15,
                ),
                const SizedBox(width: 6),
                Text(
                  booking.tripDirection == 'TO_DFW' ? 'To DFW Airport' : 'From DFW Airport',
                  style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
                ),
                const Spacer(),
                if (booking.dropoffTerminal != null)
                  Text(
                    'Terminal ${booking.dropoffTerminal}',
                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 12),
                  ),
              ],
            ),
            const SizedBox(height: 6),

            // Address
            Row(
              children: [
                const Icon(Icons.location_on_rounded, color: TColors.whiteMuted, size: 15),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    booking.pickupAddress,
                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            if (showActions) ...[
              const SizedBox(height: 14),
              const Divider(color: TColors.border, height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TraqqButton(
                      label: 'Details',
                      isOutlined: true,
                      onPressed: () => context.push('/booking-details/${booking.id}'),
                    ),
                  ),
                  if (booking.status == 'CONFIRMED' || booking.status == 'PENDING') ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: TraqqButton(
                        label: 'Track',
                        icon: Icons.location_on_rounded,
                        onPressed: () => context.push('/tracking/${booking.id}'),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
