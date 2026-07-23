import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/providers.dart';
import '../theme/app_theme.dart';

class PackagesScreen extends ConsumerWidget {
  const PackagesScreen({super.key});

  static const _plans = [
    _Plan('2 Rides', 2, 179.0, false, '89.50/ride'),
    _Plan('4 Rides', 4, 349.0, true, '87.25/ride'),
    _Plan('6 Rides', 6, 529.0, false, '88.17/ride'),
    _Plan('8 Rides', 8, 699.0, false, '87.38/ride'),
  ];

  static const _terms = [
    'Monthly ride packages are valid for 30 days from purchase date.',
    'Each ride counts as one one-way airport transfer.',
    'Unused rides do not roll over.',
    'Advance booking is required.',
    'Rides are subject to availability.',
    'Packages are non-refundable.',
    'Packages are non-transferable.',
    'Additional fees may apply for: Extra stops, Extra luggage, Out-of-area pickups, Special requests.',
    'Changes to bookings are subject to availability.',
    'Holiday and peak travel availability may be limited.',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeAsync = ref.watch(activePackagesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ride Packages')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active package banner
            activeAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (packages) {
                if (packages.isEmpty) return const SizedBox.shrink();
                final pkg = packages.first;
                return Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: TColors.goldDim,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: TColors.gold.withOpacity(0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.check_circle_rounded, color: TColors.gold, size: 16),
                          SizedBox(width: 8),
                          Text('ACTIVE PACKAGE',
                              style: TextStyle(color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('${pkg.remainingRides} of ${pkg.totalRides} rides remaining',
                          style: const TextStyle(color: TColors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                      if (pkg.expiresAt != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Expires ${pkg.expiresAt!.month}/${pkg.expiresAt!.day}/${pkg.expiresAt!.year}',
                          style: const TextStyle(color: TColors.whiteMuted, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),

            const Text('SAVE MORE, FLY MORE',
                style: TextStyle(color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2)),
            const SizedBox(height: 8),
            const Text('Pre-purchase rides and save on every airport trip.',
                style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
            const SizedBox(height: 20),

            // Package cards
            ...PackagesScreen._plans.map((plan) => _PackageCard(plan: plan)),

            const SizedBox(height: 24),

            // Terms accordion
            _TermsAccordion(terms: PackagesScreen._terms),

            const SizedBox(height: 12),
            const Text(
              'Terms apply. Monthly packages are valid for 30 days from purchase date. Unused rides do not roll over. Advance booking required. Packages are non-refundable and non-transferable.',
              style: TextStyle(color: TColors.whiteMuted, fontSize: 11, height: 1.5),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _Plan {
  final String label;
  final int rides;
  final double price;
  final bool isPopular;
  final String pricePerRide;
  const _Plan(this.label, this.rides, this.price, this.isPopular, this.pricePerRide);
}

class _PackageCard extends StatelessWidget {
  final _Plan plan;
  const _PackageCard({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: plan.isPopular ? TColors.goldDim : TColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: plan.isPopular ? TColors.gold : TColors.border,
          width: plan.isPopular ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(plan.label,
                  style: const TextStyle(color: TColors.white, fontSize: 17, fontWeight: FontWeight.w700)),
              if (plan.isPopular) ...[
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: TColors.gold,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('POPULAR',
                      style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
                ),
              ],
              const Spacer(),
              Text('\$${plan.price.toStringAsFixed(0)}',
                  style: const TextStyle(color: TColors.gold, fontSize: 20, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 4),
          Text('~\$${plan.pricePerRide}',
              style: const TextStyle(color: TColors.whiteMuted, fontSize: 12)),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: plan.isPopular ? TColors.gold : TColors.bgElevated,
                foregroundColor: plan.isPopular ? Colors.black : TColors.white,
                side: plan.isPopular ? null : const BorderSide(color: TColors.border),
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Package purchase — please complete via the website or contact support.'),
                    duration: Duration(seconds: 4),
                  ),
                );
              },
              child: Text('Purchase ${plan.label}'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TermsAccordion extends StatefulWidget {
  final List<String> terms;
  const _TermsAccordion({required this.terms});
  @override
  State<_TermsAccordion> createState() => _TermsAccordionState();
}

class _TermsAccordionState extends State<_TermsAccordion> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TColors.border),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => setState(() => _open = !_open),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Text('Terms & Conditions',
                      style: TextStyle(color: TColors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  Icon(_open ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: TColors.gold),
                ],
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: widget.terms
                    .asMap()
                    .entries
                    .map((e) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${e.key + 1}. ',
                                  style: const TextStyle(color: TColors.gold, fontSize: 12, fontWeight: FontWeight.w700)),
                              Expanded(
                                child: Text(e.value,
                                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 12, height: 1.5)),
                              ),
                            ],
                          ),
                        ))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}
