import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  static const _sections = [
    (
      'Acceptance of Terms',
      'By accessing or using the TRAQQ platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. TRAQQ reserves the right to modify these terms at any time with notice provided on this page.',
    ),
    (
      'Service Description',
      'TRAQQ provides private door-to-door airport shuttle transportation to and from Dallas/Fort Worth International Airport (DFW). The Service operates at a flat rate of \$99 per trip for up to 6 passengers. TRAQQ is not affiliated with DFW Airport or the City of Dallas.',
    ),
    (
      'Bookings and Payment',
      'All bookings must be completed through the TRAQQ platform. Payment is due at the time of booking. We accept all major credit cards through our payment processor, Stripe. Your booking is not confirmed until full payment is received and a confirmation is issued.\n\nThe flat rate of \$99 covers transportation for up to 6 passengers. No additional fees are charged for luggage, fuel, or tolls.',
    ),
    (
      'Cancellations and Refunds',
      'See our Cancellation Policy for complete information on cancellations, rescheduling, and refunds.',
    ),
    (
      'Passenger Responsibilities',
      'Passengers must be ready at the pickup address at the scheduled time. Late passengers may result in the driver departing to avoid jeopardizing other commitments. TRAQQ is not responsible for missed flights due to passenger tardiness.\n\nPassengers are responsible for providing an accurate pickup address and terminal selection. TRAQQ is not liable for delays caused by incorrect booking information.',
    ),
    (
      'Limitation of Liability',
      'To the maximum extent permitted by applicable law, TRAQQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including missed flights, loss of baggage, or delays caused by traffic, weather, or other circumstances beyond our control.',
    ),
    (
      'Privacy',
      'Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference.',
    ),
    (
      'Governing Law',
      'These Terms shall be governed by the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Dallas County, Texas.',
    ),
    (
      'Contact',
      'Questions about these Terms may be directed to legal@traqq.com or through our Contact page.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms of Service')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ..._sections.map((s) => _Section(s.$1, s.$2)),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final String body;
  const _Section(this.title, this.body);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(body,
                style: const TextStyle(color: TColors.white, fontSize: 14, height: 1.6)),
          ],
        ),
      );
}
