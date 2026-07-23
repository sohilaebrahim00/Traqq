import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('About TRAQQ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _GoldLabel('OUR STORY'),
            const SizedBox(height: 8),
            const Text('About TRAQQ',
                style: TextStyle(color: TColors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1.2)),
            const SizedBox(height: 8),
            const Text('Premium private airport transportation built for modern travelers.',
                style: TextStyle(color: TColors.whiteMuted, fontSize: 15, height: 1.6)),
            const SizedBox(height: 28),
            _GoldLabel('OUR MISSION'),
            const SizedBox(height: 12),
            const Text(
              'To make private airport transportation easier, clearer, and more dependable. TRAQQ was designed to make airport shuttle booking simple, reliable, and professional — with a smooth door-to-door experience for DFW travelers at transparent pricing.\n\nNo surge pricing. No strangers sharing your ride. No guessing what you\'ll pay. One flat rate of \$99 for up to 6 passengers, every time.',
              style: TextStyle(color: TColors.white, fontSize: 15, height: 1.6),
            ),
            const SizedBox(height: 28),
            _GoldLabel('WHAT WE OFFER'),
            const SizedBox(height: 12),
            ...[
              ('Private Shuttle Bookings', 'Your group, your vehicle. No shared rides, no strangers, no unexpected stops.'),
              ('Flat \$99 Pricing', 'One transparent price for the entire shuttle. No hidden fees, no tips required.'),
              ('Door-to-Door Service', 'Picked up at your front door, dropped at your DFW terminal — that\'s the full service.'),
              ('Up to 6 Passengers', 'Travel with your whole group for the same \$99. Perfect for families and business teams.'),
              ('Secure Online Payment', 'Stripe-powered checkout with industry-standard security. Your card is never stored.'),
              ('QR-Based Confirmation', 'A unique QR code generated instantly after payment — your digital boarding pass.'),
            ].map((item) => _BulletCard(item.$1, item.$2)),
            const SizedBox(height: 28),
            _GoldLabel('OUR VALUES'),
            const SizedBox(height: 12),
            ...[
              ('Professionalism', 'Every interaction, every ride — held to a standard worthy of your time and trust.'),
              ('Reliability', 'Your driver is there when we say they will be. Your flight can\'t wait — neither can we.'),
              ('Transparency', 'The price you see is the price you pay. Always. No fine print, no surprises.'),
              ('Comfort', 'Clean, spacious vehicles with room for passengers and luggage — never cramped.'),
              ('Safety', 'Professional drivers, safe vehicles, and secure payment. Your safety is non-negotiable.'),
              ('Premium Service', 'Airport transportation that feels like it belongs in the same category as your flight.'),
            ].map((item) => _BulletCard(item.$1, item.$2)),
            const SizedBox(height: 28),
            _GoldLabel('CONTACT'),
            const SizedBox(height: 12),
            _InfoRow(Icons.email_rounded, 'support@mytraqq.com'),
            const SizedBox(height: 8),
            _InfoRow(Icons.location_on_rounded, '5860 Collin McKinney Pkwy, Suite 605\nMcKinney, TX 75070'),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _GoldLabel extends StatelessWidget {
  final String text;
  const _GoldLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2));
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow(this.icon, this.text);
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: TColors.gold, size: 16),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(color: TColors.white, fontSize: 14, height: 1.5))),
        ],
      );
}

class _BulletCard extends StatelessWidget {
  final String title;
  final String desc;
  const _BulletCard(this.title, this.desc);
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: TColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(desc, style: const TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.5)),
          ],
        ),
      );
}
