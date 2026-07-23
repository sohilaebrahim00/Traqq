import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

const _kStatusOrder = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'IN_PROGRESS',
  'COMPLETED',
];

const _kStatusLabels = {
  'PENDING':              'Pending',
  'CONFIRMED':            'Confirmed',
  'DRIVER_ASSIGNED':      'Driver Assigned',
  'EN_ROUTE_TO_PICKUP':   'En Route to Pickup',
  'ARRIVED_AT_PICKUP':    'Driver Arrived',
  'IN_PROGRESS':          'Ride in Progress',
  'COMPLETED':            'Completed',
  'CANCELLED':            'Cancelled',
};

const _kStatusIcons = {
  'PENDING':              Icons.hourglass_empty_rounded,
  'CONFIRMED':            Icons.check_circle_outline_rounded,
  'DRIVER_ASSIGNED':      Icons.person_rounded,
  'EN_ROUTE_TO_PICKUP':   Icons.directions_car_rounded,
  'ARRIVED_AT_PICKUP':    Icons.location_on_rounded,
  'IN_PROGRESS':          Icons.play_arrow_rounded,
  'COMPLETED':            Icons.flag_rounded,
  'CANCELLED':            Icons.cancel_rounded,
};

class RideStatusStepper extends StatelessWidget {
  final String currentStatus;

  const RideStatusStepper({super.key, required this.currentStatus});

  @override
  Widget build(BuildContext context) {
    if (currentStatus == 'CANCELLED') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: TColors.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: TColors.error.withOpacity(0.3)),
        ),
        child: const Row(
          children: [
            Icon(Icons.cancel_rounded, color: TColors.error, size: 20),
            SizedBox(width: 10),
            Text('This booking has been cancelled.',
                style: TextStyle(color: TColors.error, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    final currentIndex = _kStatusOrder.indexOf(currentStatus);

    return Column(
      children: List.generate(_kStatusOrder.length, (i) {
        final status = _kStatusOrder[i];
        final isCompleted = i < currentIndex;
        final isCurrent = i == currentIndex;
        final isUpcoming = i > currentIndex;
        final isLast = i == _kStatusOrder.length - 1;

        Color nodeColor;
        Color lineColor;
        if (isCompleted) {
          nodeColor = TColors.success;
          lineColor = TColors.success;
        } else if (isCurrent) {
          nodeColor = TColors.gold;
          lineColor = TColors.border;
        } else {
          nodeColor = TColors.border;
          lineColor = TColors.border;
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Timeline column
            Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isUpcoming ? TColors.bgElevated : nodeColor.withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: nodeColor, width: isCurrent ? 2 : 1.5),
                  ),
                  child: Icon(
                    _kStatusIcons[status] ?? Icons.circle_rounded,
                    color: nodeColor,
                    size: 16,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 32,
                    color: lineColor,
                  ),
              ],
            ),
            const SizedBox(width: 14),

            // Label
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(top: 6, bottom: isLast ? 0 : 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _kStatusLabels[status] ?? status,
                      style: TextStyle(
                        color: isUpcoming
                            ? TColors.whiteFaint
                            : isCurrent
                                ? TColors.gold
                                : TColors.white,
                        fontSize: 14,
                        fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                    if (isCurrent)
                      const Text('Current status',
                          style: TextStyle(color: TColors.gold, fontSize: 11)),
                  ],
                ),
              ),
            ),

            if (isCompleted)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Icon(Icons.check_rounded, color: TColors.success, size: 16),
              ),
          ],
        );
      }),
    );
  }
}
