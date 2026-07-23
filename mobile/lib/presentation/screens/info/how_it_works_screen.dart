import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class HowItWorksScreen extends StatelessWidget {
  const HowItWorksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const steps = [
      (
        '01',
        'Select Your Ride Details',
        'Choose your pickup date, pickup time (half-hour slots), pickup address, passenger count, luggage, and preferred DFW terminal. Booking takes under 2 minutes.',
      ),
      (
        '02',
        'Review Your Booking',
        'Confirm all your trip details before heading to checkout. Make sure the date, time, terminal, and passenger count are correct.',
      ),
      (
        '03',
        'Pay Securely',
        'Complete your \$99 flat-rate payment through our Stripe-powered checkout. Your card details are handled by Stripe and never stored on our servers.',
      ),
      (
        '04',
        'Receive Confirmation',
        'After payment is confirmed, your booking status updates to CONFIRMED and a unique QR code is generated for your ride.',
      ),
      (
        '05',
        'Ride Smoothly',
        'Your private driver arrives at your pickup address at the scheduled time and takes you directly to your DFW terminal — door to terminal, zero hassle.',
      ),
    ];

    const whyItems = [
      ('Always \$99', 'One transparent flat rate for the entire shuttle — no per-person fees, no surge pricing.'),
      ('Up to 6 Passengers', 'Bring the whole group for the same price. Split it and it\'s outstanding value.'),
      ('All DFW Terminals', 'Terminals A, B, C, D, and E — your driver goes directly to your terminal.'),
      ('No App Required', 'Book from any browser, no account needed. Guests can book with just a phone number.'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('How It Works')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('SIMPLE PROCESS',
                style: TextStyle(color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2)),
            const SizedBox(height: 8),
            const Text('How TRAQQ Works',
                style: TextStyle(color: TColors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1.2)),
            const SizedBox(height: 8),
            const Text('A simple premium booking experience from start to finish.',
                style: TextStyle(color: TColors.whiteMuted, fontSize: 14, height: 1.6)),
            const SizedBox(height: 24),
            ...steps.map((s) => _StepCard(s.$1, s.$2, s.$3)),
            const SizedBox(height: 24),
            const Text('WHY TRAQQ',
                style: TextStyle(color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2)),
            const SizedBox(height: 12),
            ...whyItems.map((item) => _WhyCard(item.$1, item.$2)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TColors.goldDim,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TColors.gold.withValues(alpha: 0.3)),
              ),
              child: const Text(
                'That\'s all there is to it. Book your private DFW shuttle now and travel with confidence.',
                style: TextStyle(color: TColors.gold, fontSize: 14, fontWeight: FontWeight.w600, height: 1.5),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _StepCard extends StatelessWidget {
  final String number;
  final String title;
  final String description;
  const _StepCard(this.number, this.title, this.description);

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TColors.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0x33C9A84C),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(number,
                    style: const TextStyle(color: TColors.gold, fontSize: 12, fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(color: TColors.white, fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(description,
                      style: const TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.5)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _WhyCard extends StatelessWidget {
  final String title;
  final String description;
  const _WhyCard(this.title, this.description);

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
            Text(title,
                style: const TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(description,
                style: const TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.5)),
          ],
        ),
      );
}
