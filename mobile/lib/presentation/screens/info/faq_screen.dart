import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});
  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  int? _open;

  static const _faqs = [
    (
      'What is TRAQQ?',
      'TRAQQ is a premium private airport shuttle booking platform for door-to-door transportation to or from DFW Airport. Book online in minutes, pay securely, and receive a QR confirmation for your ride.',
    ),
    (
      'What airport does TRAQQ serve?',
      'TRAQQ currently serves Dallas Fort Worth International Airport, including Terminals A, B, C, D, and E. Your driver will take you directly to the terminal you select during booking.',
    ),
    (
      'Is the price really \$99?',
      'Yes. TRAQQ offers a flat \$99 rate for eligible private airport shuttle bookings — for the entire vehicle, not per person. No surge pricing, no hidden fees, no tips required. What you see at booking is exactly what you pay.',
    ),
    (
      'How many passengers can ride?',
      'Each booking allows up to 6 passengers. Whether it\'s just you, your family, or a small business group — everyone travels together in one private vehicle for the same \$99.',
    ),
    (
      'Can I book pickup or drop-off?',
      'Yes. TRAQQ supports both airport pickup (DFW → your location) and airport drop-off (your location → DFW) service depending on your trip needs. Select your direction when booking.',
    ),
    (
      'What details do I need to book?',
      'You\'ll need your pickup date, pickup time (half-hour slots only), pickup address, passenger count, carry-on and checked luggage details, preferred terminal, and a phone number. An email is optional.',
    ),
    (
      'What happens after payment?',
      'After successful payment, your booking is confirmed and a QR code is generated for your ride. You can view your QR code on the confirmation page and look up your booking anytime using your Booking ID.',
    ),
    (
      'How do I receive my QR code?',
      'Your QR code appears on the success page immediately after payment is confirmed. Screenshot or save it — your driver will scan it at pickup as your ride confirmation.',
    ),
    (
      'Can I change or cancel my booking?',
      'Cancellations made 24 hours or more before your scheduled pickup are eligible for a full refund. Changes depend on driver availability. Please see our Cancellation Policy or contact TRAQQ support for assistance.',
    ),
    (
      'What if my flight time changes?',
      'If your flight time changes, contact support as soon as possible so your booking details can be reviewed and adjusted. We understand travel disruptions happen and we\'ll work with you to find a solution.',
    ),
    (
      'Is payment secure?',
      'Yes. All payments are processed through Stripe using industry-standard secure payment infrastructure. Your card details are never stored on TRAQQ servers — Stripe handles all payment data with PCI-compliant security.',
    ),
    (
      'How do I contact support?',
      'You can reach TRAQQ through the Contact page or by email at support@mytraqq.com. Our support team is available daily 6 AM – 10 PM CT.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FAQ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: List.generate(_faqs.length, (i) {
            final faq = _faqs[i];
            final isOpen = _open == i;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: TColors.bgCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: isOpen ? TColors.gold.withOpacity(0.5) : TColors.border),
              ),
              child: Column(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () => setState(() => _open = isOpen ? null : i),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(faq.$1,
                                style: TextStyle(
                                    color: isOpen ? TColors.gold : TColors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600)),
                          ),
                          Icon(
                            isOpen ? Icons.remove_rounded : Icons.add_rounded,
                            color: TColors.gold,
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isOpen)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Text(faq.$2,
                          style: const TextStyle(
                              color: TColors.whiteMuted, fontSize: 13, height: 1.6)),
                    ),
                ],
              ),
            );
          }),
        ),
      ),
    );
  }
}
