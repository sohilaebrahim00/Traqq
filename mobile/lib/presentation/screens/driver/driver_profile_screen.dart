import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';

class DriverProfileScreen extends ConsumerWidget {
  const DriverProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final profileAsync = ref.watch(driverProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Driver Profile')),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text('Error: $e', style: const TextStyle(color: TColors.error)),
        ),
        data: (profile) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: TColors.goldDim,
                          shape: BoxShape.circle,
                          border: Border.all(color: TColors.gold.withOpacity(0.4), width: 2),
                        ),
                        child: const Icon(Icons.person_rounded, color: TColors.gold, size: 44),
                      ),
                      const SizedBox(height: 12),
                      if (auth.user != null) ...[
                        Text(auth.user!.fullName,
                            style: const TextStyle(
                                color: TColors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w700)),
                        Text(auth.user!.email ?? '',
                            style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Vehicle info
                if (profile != null) ...[
                  _SectionHeader('Vehicle'),
                  const SizedBox(height: 12),
                  _InfoCard([
                    _InfoRow('Make', profile.vehicleMake.isNotEmpty ? profile.vehicleMake : '—'),
                    _InfoRow('Model', profile.vehicleModel.isNotEmpty ? profile.vehicleModel : '—'),
                    _InfoRow('Color', profile.vehicleColor.isNotEmpty ? profile.vehicleColor : '—'),
                    _InfoRow('Plate', profile.vehiclePlate.isNotEmpty ? profile.vehiclePlate : '—'),
                  ]),
                  const SizedBox(height: 24),
                ],

                // Stats
                _SectionHeader('Account'),
                const SizedBox(height: 12),
                _InfoCard([
                  _InfoRow('Available', profile?.isAvailable == true ? 'Yes' : 'No'),
                  if (profile?.licenseNumber != null)
                    _InfoRow('License', profile!.licenseNumber!),
                ]),

                const SizedBox(height: 32),

                // Sign out
                TraqqButton(
                  label: 'Sign Out',
                  isDestructive: true,
                  onPressed: () async {
                    await ref.read(authProvider.notifier).signOut();
                    if (context.mounted) context.go('/driver/login');
                  },
                ),
                const SizedBox(height: 48),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(),
        style: const TextStyle(
            color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2));
  }
}

class _InfoRow {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
}

class _InfoCard extends StatelessWidget {
  final List<_InfoRow> rows;
  const _InfoCard(this.rows);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TColors.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TColors.border),
      ),
      child: Column(
        children: List.generate(rows.length, (i) {
          final r = rows[i];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    Text(r.label,
                        style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                    const Spacer(),
                    Text(r.value,
                        style: const TextStyle(
                            color: TColors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              if (i < rows.length - 1) const Divider(color: TColors.border, height: 1),
            ],
          );
        }),
      ),
    );
  }
}
