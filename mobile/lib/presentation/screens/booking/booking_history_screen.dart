import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/booking_card.dart';
import '../../widgets/traqq_button.dart';

class BookingHistoryScreen extends ConsumerWidget {
  const BookingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(customerBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(customerBookingsProvider),
          ),
        ],
      ),
      body: bookingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded, color: TColors.error, size: 48),
                const SizedBox(height: 16),
                Text('Failed to load bookings',
                    style: const TextStyle(color: TColors.white, fontSize: 16)),
                const SizedBox(height: 8),
                Text(e.toString().replaceAll('Exception: ', ''),
                    style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
                    textAlign: TextAlign.center),
                const SizedBox(height: 24),
                TraqqButton(
                  label: 'Retry',
                  isOutlined: true,
                  onPressed: () => ref.invalidate(customerBookingsProvider),
                ),
              ],
            ),
          ),
        ),
        data: (bookings) {
          if (bookings.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.receipt_long_rounded,
                        color: TColors.whiteFaint, size: 56),
                    const SizedBox(height: 16),
                    const Text('No bookings yet',
                        style: TextStyle(
                            color: TColors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text('Book your first TRAQQ ride today.',
                        style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
                    const SizedBox(height: 24),
                    TraqqButton(
                      label: 'Book a Ride',
                      icon: Icons.directions_car_rounded,
                      onPressed: () => context.push('/booking'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(customerBookingsProvider),
            color: TColors.gold,
            backgroundColor: TColors.bgCard,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: bookings.length,
              itemBuilder: (_, i) => BookingCard(booking: bookings[i]),
            ),
          );
        },
      ),
    );
  }
}
