import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class CancellationPolicyScreen extends StatelessWidget {
  const CancellationPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cancellation Policy')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Refund tiers
            _TierCard(
              timeLabel: '24+ Hours Before Pickup',
              badge: 'Full Refund',
              badgeColor: TColors.success,
              description: 'Cancel at least 24 hours before your scheduled pickup and receive a full refund to your original payment method within 5–10 business days.',
            ),
            const SizedBox(height: 10),
            _TierCard(
              timeLabel: '4–24 Hours Before Pickup',
              badge: '50% Refund',
              badgeColor: TColors.warning,
              description: 'Cancel between 4 and 24 hours before your scheduled pickup and receive a 50% refund. The remaining 50% covers driver assignment and preparation costs.',
            ),
            const SizedBox(height: 10),
            _TierCard(
              timeLabel: 'Less Than 4 Hours Before Pickup',
              badge: 'No Refund',
              badgeColor: TColors.error,
              description: 'Cancellations within 4 hours of your scheduled pickup are non-refundable.',
            ),
            const SizedBox(height: 24),
            _Section('How to Cancel',
                'To cancel a booking, contact us through our Contact page or email bookings@traqq.com. Include your Booking ID in your message.'),
            _Section('Refund Processing',
                'Approved refunds are issued to the original payment method within 5–10 business days, depending on your card issuer.'),
            _Section('Flight Delays',
                'If your flight is delayed by the airline and you need to reschedule your pickup, contact us immediately. We will not charge a cancellation fee for flight-delay reschedules, provided you notify us before your scheduled pickup time.'),
            _Section('Driver No-Shows',
                'In the unlikely event that your driver does not arrive within 15 minutes of your scheduled pickup, you are entitled to a full refund. Contact us immediately if this happens.'),
            _Section('Weather and Force Majeure',
                'In cases of severe weather, road closures, or other events beyond our control, TRAQQ will offer a full reschedule at no charge or a full refund. We will contact affected customers as soon as possible.'),
            _Section('Rescheduling',
                'You may reschedule a booking at no charge if you notify us at least 4 hours before your original pickup time and a suitable driver is available for the new time.'),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TColors.bgCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: TColors.border),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Need to cancel?',
                      style: TextStyle(color: TColors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                  SizedBox(height: 6),
                  Text(
                    'Contact us at bookings@traqq.com or use the Contact page. Include your Booking ID.',
                    style: TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _TierCard extends StatelessWidget {
  final String timeLabel;
  final String badge;
  final Color badgeColor;
  final String description;
  const _TierCard({
    required this.timeLabel,
    required this.badge,
    required this.badgeColor,
    required this.description,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: TColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(timeLabel,
                      style: const TextStyle(color: TColors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(badge,
                      style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(description,
                style: const TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.5)),
          ],
        ),
      );
}

class _Section extends StatelessWidget {
  final String title;
  final String body;
  const _Section(this.title, this.body);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(body,
                style: const TextStyle(color: TColors.white, fontSize: 14, height: 1.6)),
          ],
        ),
      );
}
