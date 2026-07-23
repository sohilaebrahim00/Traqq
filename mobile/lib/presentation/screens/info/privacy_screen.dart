import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const _sections = [
    (
      'Information We Collect',
      'When you use TRAQQ, we collect the following information:\n\n• Booking information: Pickup address, pickup date and time, terminal, passenger count, and luggage details.\n• Contact information: Phone number and optionally your email address.\n• Account information: Full name, phone number, email address, and hashed password (if you create an account).\n• Payment information: Processed entirely by Stripe. TRAQQ does not store your card number, expiry, or CVV.',
    ),
    (
      'How We Use Your Information',
      'We use your information to:\n• Fulfill your shuttle booking and communicate trip details.\n• Generate your booking confirmation and QR code.\n• Send booking-related communications (confirmation, reminders).\n• Improve our service and resolve disputes.\n\nWe do not sell your personal data to third parties. We do not use your information for advertising purposes.',
    ),
    (
      'Payment Processing',
      'All payments are processed by Stripe. When you pay, your card data goes directly to Stripe and is governed by Stripe\'s Privacy Policy. TRAQQ only receives a payment confirmation and a transaction reference — never your raw card details.',
    ),
    (
      'Data Retention',
      'Booking records are retained for 3 years for business and legal compliance purposes. Account information is retained until you request deletion. Contact legal@traqq.com to request deletion of your data.',
    ),
    (
      'Cookies and Local Storage',
      'TRAQQ uses your browser\'s local storage to remember your authentication session and recent bookings. We do not use tracking cookies or third-party analytics beyond what is strictly necessary to operate the service.',
    ),
    (
      'Your Rights',
      'You have the right to access, correct, or delete your personal data at any time. Contact us at legal@traqq.com or through our Contact page.',
    ),
    (
      'Security',
      'We use industry-standard security practices including HTTPS encryption, hashed passwords (bcrypt), and short-lived JWT tokens. While no system is 100% secure, we take reasonable measures to protect your information.',
    ),
    (
      'Contact',
      'Privacy questions may be directed to legal@traqq.com.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
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
