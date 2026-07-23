import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';
import '../../widgets/address_autocomplete_widget.dart';
import '../../../core/utils/app_date_utils.dart';
import '../../../data/models/booking_model.dart';

// Step index constants
const _kDirection = 0;
const _kDate      = 1;
const _kTime      = 2;
const _kAddress   = 3;
const _kPassengers = 4;
const _kLuggage   = 5;
const _kWheelchair = 6;
const _kTerminal  = 7;
const _kFlight    = 8;
const _kContact   = 9;

const _kStepLabels = [
  'Trip Direction', 'Pickup Date', 'Pickup Time', 'Pickup Address',
  'Passengers & Vans', 'Luggage', 'Accessibility', 'DFW Terminal',
  'Flight Details', 'Contact Info',
];

class BookingFlowScreen extends ConsumerStatefulWidget {
  const BookingFlowScreen({super.key});

  @override
  ConsumerState<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends ConsumerState<BookingFlowScreen> {
  int _step = 0;
  String? _stepError;
  bool _submitting = false;

  void _setError(String? msg) => setState(() => _stepError = msg);

  void _next() {
    final err = _validate();
    if (err != null) { _setError(err); return; }
    _setError(null);
    final flow = ref.read(bookingFlowProvider);
    final isP2P = flow.tripDirection == 'POINT_TO_POINT';

    if (_step == _kWheelchair && isP2P) {
      setState(() => _step = _kFlight); // Skip terminal step (step 7) for P2P
    } else if (_step < _kStepLabels.length - 1) {
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  void _back() {
    final flow = ref.read(bookingFlowProvider);
    final isP2P = flow.tripDirection == 'POINT_TO_POINT';

    if (_step > 0) {
      if (_step == _kFlight && isP2P) {
        setState(() { _step = _kWheelchair; _stepError = null; });
      } else {
        setState(() { _step--; _stepError = null; });
      }
    }
  }

  String? _validate() {
    final flow = ref.read(bookingFlowProvider);
    return switch (_step) {
      _kDirection  => flow.tripDirection == null ? 'Please select a trip direction.' : null,
      _kDate       => flow.pickupDate == null ? 'Please select a pickup date.' : null,
      _kTime       => flow.pickupTime == null ? 'Please select a pickup time.' : null,
      _kAddress    => flow.tripDirection == 'POINT_TO_POINT'
          ? (!flow.addressValidated
              ? 'Please select a valid pickup address.'
              : !flow.destValidated
                  ? 'Please select a valid destination address.'
                  : null)
          : (!flow.addressValidated
              ? 'Please select a valid address from the suggestions.'
              : null),
      _kPassengers => null,
      _kLuggage    => null,
      _kWheelchair => flow.wheelchairRequired == null
          ? 'Please answer the accessibility question.'
          : flow.wheelchairRequired!
              ? 'Wheelchair-accessible service is not available. Please use Uber Assist or Lyft Access.'
              : null,
      _kTerminal   => flow.tripDirection == 'POINT_TO_POINT'
          ? null
          : (flow.dropoffTerminal == null ? 'Please select a terminal.' : null),
      _kFlight     => null,
      _kContact    => _validateContact(flow),
      _ => null,
    };
  }

  String? _validateContact(BookingFlowData flow) {
    final phone = flow.phoneNumber?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (phone.length < 10) return 'Phone number must be at least 10 digits.';
    final email = flow.email?.trim() ?? '';
    if (email.isNotEmpty && !email.contains('@')) return 'Enter a valid email address.';
    return null;
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final flow = ref.read(bookingFlowProvider);
      final ds = ref.read(bookingDataSourceProvider);
      final booking = await ds.createBooking(flow.toApiPayload());

      // Navigate to checkout, pass booking ID + ref
      if (mounted) {
        ref.read(bookingFlowProvider.notifier).reset();
        context.go('/checkout', extra: {
          'bookingId': booking.id,
          'bookingRef': booking.displayRef,
          'amountCents': (booking.totalPrice * 100).round(),
        });
      }
    } catch (e) {
      setState(() {
        _submitting = false;
        _stepError = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final flow = ref.watch(bookingFlowProvider);

    return Scaffold(
      appBar: AppBar(
        leading: _step > 0
            ? BackButton(onPressed: _back)
            : CloseButton(onPressed: () => context.pop()),
        title: Text(_kStepLabels[_step]),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text(
              '${_step + 1}/${_kStepLabels.length}',
              style: const TextStyle(color: TColors.whiteMuted, fontSize: 13),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: (_step + 1) / _kStepLabels.length,
            backgroundColor: TColors.border,
            valueColor: const AlwaysStoppedAnimation(TColors.gold),
            minHeight: 3,
          ),

          // Step content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: _buildStep(flow),
            ),
          ),

          // Error + actions
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_stepError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: TColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: TColors.error.withOpacity(0.3)),
                    ),
                    child: Text(
                      _stepError!,
                      style: const TextStyle(color: TColors.error, fontSize: 13),
                    ),
                  ),

                // Disable Continue if wheelchair required
                TraqqButton(
                  label: _step == _kStepLabels.length - 1 ? 'Review & Pay' : 'Continue',
                  isLoading: _submitting,
                  onPressed: flow.wheelchairRequired == true ? null : _next,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep(BookingFlowData flow) {
    return switch (_step) {
      _kDirection  => _DirectionStep(flow: flow),
      _kDate       => _DateStep(flow: flow),
      _kTime       => _TimeStep(flow: flow),
      _kAddress    => _AddressStep(flow: flow),
      _kPassengers => _PassengersStep(flow: flow),
      _kLuggage    => _LuggageStep(flow: flow),
      _kWheelchair => _WheelchairStep(flow: flow),
      _kTerminal   => _TerminalStep(flow: flow),
      _kFlight     => _FlightStep(flow: flow),
      _kContact    => _ContactStep(flow: flow),
      _            => const SizedBox(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — Direction
// ─────────────────────────────────────────────────────────────────────────────

class _DirectionStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _DirectionStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const bookingTypes = [
      ('CONCERT', 'Concert / Show'),
      ('HOTEL', 'Hotel'),
      ('RESTAURANT', 'Restaurant'),
      ('WEDDING', 'Wedding Venue'),
      ('PRIVATE_EVENT', 'Private Event'),
      ('POINT_TO_POINT', 'Point-to-Point'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Where are you going?',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Choose your trip direction to get started.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 24),
        _DirectionCard(
          label: 'To DFW Airport',
          sub: 'Pickup from your address',
          icon: Icons.flight_takeoff_rounded,
          selected: flow.tripDirection == 'TO_DFW',
          onTap: () => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(tripDirection: 'TO_DFW', bookingType: 'AIRPORT'),
              ),
        ),
        const SizedBox(height: 12),
        _DirectionCard(
          label: 'From DFW Airport',
          sub: 'Pickup from DFW terminal',
          icon: Icons.flight_land_rounded,
          selected: flow.tripDirection == 'FROM_DFW',
          onTap: () => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(tripDirection: 'FROM_DFW', bookingType: 'AIRPORT'),
              ),
        ),
        const SizedBox(height: 12),
        _DirectionCard(
          label: 'Point-to-Point / Custom Event',
          sub: 'Concerts, Hotels, Restaurants, Weddings, Private Events',
          icon: Icons.alt_route_rounded,
          selected: flow.tripDirection == 'POINT_TO_POINT',
          onTap: () => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(tripDirection: 'POINT_TO_POINT'),
              ),
        ),
        if (flow.tripDirection == 'POINT_TO_POINT') ...[
          const SizedBox(height: 20),
          const Text('Select Category (Optional)',
              style: TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: bookingTypes.map((bt) {
              final isSel = flow.bookingType == bt.$1;
              return ChoiceChip(
                label: Text(bt.$2),
                selected: isSel,
                selectedColor: TColors.goldDim,
                backgroundColor: TColors.bgCard,
                labelStyle: TextStyle(
                  color: isSel ? TColors.gold : TColors.whiteMuted,
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.w600 : FontWeight.w400,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(color: isSel ? TColors.gold : TColors.border),
                ),
                onSelected: (_) {
                  ref.read(bookingFlowProvider.notifier).update(
                        (d) => d.copyWith(bookingType: bt.$1),
                      );
                },
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}

class _DirectionCard extends StatelessWidget {
  final String label;
  final String sub;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _DirectionCard({
    required this.label,
    required this.sub,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: selected ? TColors.goldDim : TColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? TColors.gold : TColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: selected ? TColors.gold.withOpacity(0.2) : TColors.bgElevated,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: selected ? TColors.gold : TColors.whiteMuted, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          color: selected ? TColors.gold : TColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                  Text(sub, style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: TColors.gold, size: 22),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Date
// ─────────────────────────────────────────────────────────────────────────────

class _DateStep extends ConsumerStatefulWidget {
  final BookingFlowData flow;
  const _DateStep({required this.flow});

  @override
  ConsumerState<_DateStep> createState() => _DateStepState();
}

class _DateStepState extends ConsumerState<_DateStep> {
  late DateTime _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.flow.pickupDate ?? AppDateUtils.tomorrow;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('When do you need pickup?',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.info_outline_rounded, color: TColors.gold, size: 15),
            const SizedBox(width: 6),
            const Text('Bookings must be made at least 24 hours in advance.',
                style: TextStyle(color: TColors.gold, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 24),
        CalendarDatePicker(
          initialDate: _selected,
          firstDate: AppDateUtils.tomorrow,
          lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
          onDateChanged: (d) {
            setState(() => _selected = d);
            ref.read(bookingFlowProvider.notifier).update(
                  (flow) => flow.copyWith(pickupDate: d, clearPickupTime: true),
                );
          },
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: TColors.bgCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: TColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today_rounded, color: TColors.gold, size: 18),
              const SizedBox(width: 10),
              Text(
                AppDateUtils.formatDate(_selected),
                style: const TextStyle(color: TColors.white, fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Time
// ─────────────────────────────────────────────────────────────────────────────

class _TimeStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _TimeStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dateStr = flow.pickupDate != null
        ? AppDateUtils.formatIsoDate(flow.pickupDate!)
        : '';

    final availAsync = dateStr.isNotEmpty
        ? ref.watch(availabilityProvider(dateStr))
        : null;

    final cutoff = DateTime.now().add(const Duration(hours: 24));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('What time?',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),

        if (availAsync == null)
          const Text('Select a date first.', style: TextStyle(color: TColors.whiteMuted)),

        if (availAsync != null)
          availAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (e, _) => Text('Failed to load availability: $e',
                style: const TextStyle(color: TColors.error)),
            data: (avail) {
              final slots = AppDateUtils.generateTimeSlots();
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 2.2,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                ),
                itemCount: slots.length,
                itemBuilder: (_, i) {
                  final slot = slots[i];
                  final detail = avail.slotDetails[slot];
                  final isBooked = !avail.isSlotAvailable(slot);
                  final isWithin24h = detail?.within24h ?? false;

                  // Compute within24h locally if detail not in response
                  final pickupDt = flow.pickupDate;
                  bool localWithin24h = false;
                  if (pickupDt != null && !isWithin24h) {
                    final parts = slot.split(':');
                    final h = int.tryParse(parts[0]) ?? 0;
                    final m = int.tryParse(parts[1]) ?? 0;
                    final slotDt = DateTime(pickupDt.year, pickupDt.month, pickupDt.day, h, m);
                    localWithin24h = slotDt.isBefore(cutoff);
                  }

                  final isDisabled = isBooked || isWithin24h || localWithin24h;
                  final isSelected = flow.pickupTime == slot;
                  final remaining = detail?.remaining ?? 3;

                  return _TimeSlotTile(
                    slot: slot,
                    isSelected: isSelected,
                    isDisabled: isDisabled,
                    isBooked: isBooked,
                    isWithin24h: isWithin24h || localWithin24h,
                    remaining: remaining,
                    onTap: isDisabled
                        ? null
                        : () => ref.read(bookingFlowProvider.notifier).update(
                              (d) => d.copyWith(pickupTime: slot),
                            ),
                  );
                },
              );
            },
          ),
      ],
    );
  }
}

class _TimeSlotTile extends StatelessWidget {
  final String slot;
  final bool isSelected;
  final bool isDisabled;
  final bool isBooked;
  final bool isWithin24h;
  final int remaining;
  final VoidCallback? onTap;

  const _TimeSlotTile({
    required this.slot,
    required this.isSelected,
    required this.isDisabled,
    required this.isBooked,
    required this.isWithin24h,
    required this.remaining,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color bg = isSelected
        ? TColors.goldDim
        : isDisabled
            ? TColors.bgElevated.withOpacity(0.5)
            : TColors.bgCard;
    Color border = isSelected ? TColors.gold : TColors.border;
    Color textColor = isSelected
        ? TColors.gold
        : isDisabled
            ? TColors.whiteFaint
            : TColors.white;

    String label = '';
    if (isWithin24h) label = 'Too soon';
    else if (isBooked) label = 'Full';
    else if (remaining == 1) label = '1 left';
    else if (remaining == 2) label = '2 left';

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              AppDateUtils.formatPickupTime(slot),
              style: TextStyle(
                color: textColor,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
            if (label.isNotEmpty)
              Text(
                label,
                style: TextStyle(
                  color: isBooked || isWithin24h
                      ? TColors.whiteFaint
                      : remaining == 1
                          ? TColors.warning
                          : TColors.gold,
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Address (Google Places autocomplete)
// ─────────────────────────────────────────────────────────────────────────────

class _AddressStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _AddressStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFromDFW = flow.tripDirection == 'FROM_DFW';
    final isP2P = flow.tripDirection == 'POINT_TO_POINT';

    if (isP2P) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pickup & Drop-off Addresses',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter full addresses for your origin and destination.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14),
          ),
          const SizedBox(height: 24),
          const Text(
            'Pickup Location',
            style: TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          AddressAutocompleteWidget(
            initialValue: flow.pickupAddress,
            onSelected: (address, lat, lng, placeId) {
              ref.read(bookingFlowProvider.notifier).update(
                    (d) => d.copyWith(
                      pickupAddress: address,
                      pickupLat: lat,
                      pickupLng: lng,
                      pickupPlaceId: placeId,
                      addressValidated: true,
                    ),
                  );
            },
          ),
          const SizedBox(height: 24),
          const Text(
            'Drop-off / Destination Location',
            style: TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          AddressAutocompleteWidget(
            initialValue: flow.destinationAddress,
            onSelected: (address, lat, lng, placeId) {
              ref.read(bookingFlowProvider.notifier).update(
                    (d) => d.copyWith(
                      destinationAddress: address,
                      destinationLat: lat,
                      destinationLng: lng,
                      destinationPlaceId: placeId,
                      destValidated: true,
                    ),
                  );
            },
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isFromDFW ? 'Your destination address' : 'Your pickup address',
          style: const TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          isFromDFW
              ? 'Where should we drop you off?'
              : 'Where should we pick you up?',
          style: const TextStyle(color: TColors.whiteMuted, fontSize: 14),
        ),
        const SizedBox(height: 24),
        AddressAutocompleteWidget(
          initialValue: flow.pickupAddress,
          onSelected: (address, lat, lng, placeId) {
            ref.read(bookingFlowProvider.notifier).update(
                  (d) => d.copyWith(
                    pickupAddress: address,
                    pickupLat: lat,
                    pickupLng: lng,
                    pickupPlaceId: placeId,
                    addressValidated: true,
                  ),
                );
          },
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Passengers & Vans
// ─────────────────────────────────────────────────────────────────────────────

class _PassengersStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _PassengersStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    update(BookingFlowData Function(BookingFlowData) fn) =>
        ref.read(bookingFlowProvider.notifier).update(fn);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Passengers & Vans',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 28),
        _CounterRow(
          label: 'Passengers',
          hint: 'Maximum 6 per van',
          value: flow.passengerCount,
          min: 1,
          max: 6,
          onDecrement: () => update((d) => d.copyWith(passengerCount: (d.passengerCount - 1).clamp(1, 6))),
          onIncrement: () => update((d) => d.copyWith(passengerCount: (d.passengerCount + 1).clamp(1, 6))),
        ),
        const Divider(color: TColors.border, height: 32),
        _CounterRow(
          label: 'Number of Vans',
          hint: 'TRAQQ operates up to 3 vans simultaneously',
          value: flow.vanCount,
          min: 1,
          max: 3,
          onDecrement: () => update((d) => d.copyWith(vanCount: (d.vanCount - 1).clamp(1, 3))),
          onIncrement: () => update((d) => d.copyWith(vanCount: (d.vanCount + 1).clamp(1, 3))),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TColors.goldDim,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.attach_money_rounded, color: TColors.gold, size: 20),
              const SizedBox(width: 8),
              Text(
                'Total: \$${(99.0 * flow.vanCount).toStringAsFixed(2)} USD',
                style: const TextStyle(
                    color: TColors.gold, fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CounterRow extends StatelessWidget {
  final String label;
  final String hint;
  final int value;
  final int min;
  final int max;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  const _CounterRow({
    required this.label,
    required this.hint,
    required this.value,
    required this.min,
    required this.max,
    required this.onDecrement,
    required this.onIncrement,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                color: TColors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        Text(hint, style: const TextStyle(color: TColors.whiteMuted, fontSize: 12)),
        const SizedBox(height: 14),
        Row(
          children: [
            _CounterButton(
              icon: Icons.remove,
              onTap: value <= min ? null : onDecrement,
            ),
            const SizedBox(width: 20),
            Text(
              '$value',
              style: const TextStyle(
                  color: TColors.white, fontSize: 24, fontWeight: FontWeight.w700),
            ),
            const SizedBox(width: 20),
            _CounterButton(
              icon: Icons.add,
              onTap: value >= max ? null : onIncrement,
            ),
          ],
        ),
      ],
    );
  }
}

class _CounterButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _CounterButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: onTap == null ? TColors.bgElevated.withOpacity(0.5) : TColors.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: TColors.border),
        ),
        child: Icon(icon,
            color: onTap == null ? TColors.whiteFaint : TColors.white, size: 20),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Luggage
// ─────────────────────────────────────────────────────────────────────────────

class _LuggageStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _LuggageStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    update(BookingFlowData Function(BookingFlowData) fn) =>
        ref.read(bookingFlowProvider.notifier).update(fn);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Luggage Details',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Help your driver prepare adequate space.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 28),
        _CounterRow(
          label: 'Carry-on Bags',
          hint: 'Small bags that fit overhead',
          value: flow.carryOnCount,
          min: 0,
          max: 10,
          onDecrement: () => update((d) => d.copyWith(carryOnCount: (d.carryOnCount - 1).clamp(0, 10))),
          onIncrement: () => update((d) => d.copyWith(carryOnCount: (d.carryOnCount + 1).clamp(0, 10))),
        ),
        const Divider(color: TColors.border, height: 32),
        _CounterRow(
          label: 'Checked Bags',
          hint: 'Large suitcases for cargo area',
          value: flow.checkedLuggageCount,
          min: 0,
          max: 10,
          onDecrement: () => update((d) => d.copyWith(checkedLuggageCount: (d.checkedLuggageCount - 1).clamp(0, 10))),
          onIncrement: () => update((d) => d.copyWith(checkedLuggageCount: (d.checkedLuggageCount + 1).clamp(0, 10))),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Wheelchair
// ─────────────────────────────────────────────────────────────────────────────

class _WheelchairStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _WheelchairStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    update(BookingFlowData Function(BookingFlowData) fn) =>
        ref.read(bookingFlowProvider.notifier).update(fn);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Accessibility',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text(
          'Does anyone in your party require wheelchair-accessible transportation?',
          style: TextStyle(color: TColors.whiteMuted, fontSize: 14, height: 1.6),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _DirectionCard(
                label: 'No',
                sub: 'Standard van seating',
                icon: Icons.check_circle_outline_rounded,
                selected: flow.wheelchairRequired == false,
                onTap: () => update((d) => d.copyWith(wheelchairRequired: false)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _DirectionCard(
                label: 'Yes',
                sub: 'Wheelchair accessible',
                icon: Icons.accessible_rounded,
                selected: flow.wheelchairRequired == true,
                onTap: () => update((d) => d.copyWith(wheelchairRequired: true)),
              ),
            ),
          ],
        ),

        if (flow.wheelchairRequired == true) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2A),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF4040AA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.info_outline_rounded, color: Color(0xFF9090FF), size: 16),
                    SizedBox(width: 8),
                    Text('Wheelchair Service Not Available',
                        style: TextStyle(
                            color: Color(0xFF9090FF),
                            fontWeight: FontWeight.w700,
                            fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  "TRAQQ's current fleet does not include wheelchair-accessible vehicles. We recommend:",
                  style: TextStyle(color: Color(0xFFAAAACC), fontSize: 13, height: 1.6),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _WheelchairLink(label: 'Uber Assist', url: 'https://www.uber.com/us/en/ride/uber-assist/'),
                    const SizedBox(width: 12),
                    _WheelchairLink(label: 'Lyft Access', url: 'https://www.lyft.com/accessibility'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _WheelchairLink extends StatelessWidget {
  final String label;
  final String url;

  const _WheelchairLink({required this.label, required this.url});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        // url_launcher would open this
      },
      icon: const Icon(Icons.open_in_new_rounded, size: 14, color: Color(0xFF9090FF)),
      label: Text(label, style: const TextStyle(color: Color(0xFF9090FF), fontSize: 13)),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: Color(0xFF4040AA)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — Terminal
// ─────────────────────────────────────────────────────────────────────────────

class _TerminalStep extends ConsumerWidget {
  final BookingFlowData flow;
  const _TerminalStep({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const terminals = ['A', 'B', 'C', 'D', 'E'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Which DFW Terminal?',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Select the terminal where your flight departs or arrives.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 24),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 3,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          children: terminals.map((t) {
            final selected = flow.dropoffTerminal == t;
            return GestureDetector(
              onTap: () => ref.read(bookingFlowProvider.notifier).update(
                    (d) => d.copyWith(dropoffTerminal: t),
                  ),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  color: selected ? TColors.goldDim : TColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected ? TColors.gold : TColors.border,
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Terminal',
                      style: TextStyle(
                          color: selected ? TColors.gold : TColors.whiteMuted,
                          fontSize: 11),
                    ),
                    Text(
                      t,
                      style: TextStyle(
                        color: selected ? TColors.gold : TColors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 — Flight Details (optional)
// ─────────────────────────────────────────────────────────────────────────────

class _FlightStep extends ConsumerStatefulWidget {
  final BookingFlowData flow;
  const _FlightStep({required this.flow});

  @override
  ConsumerState<_FlightStep> createState() => _FlightStepState();
}

class _FlightStepState extends ConsumerState<_FlightStep> {
  late TextEditingController _airlineCtrl;
  late TextEditingController _timeCtrl;
  late TextEditingController _notesCtrl;

  @override
  void initState() {
    super.initState();
    _airlineCtrl = TextEditingController(text: widget.flow.airline ?? '');
    _timeCtrl = TextEditingController(text: widget.flow.departureTime ?? '');
    _notesCtrl = TextEditingController(text: widget.flow.notes ?? '');
  }

  @override
  void dispose() {
    _airlineCtrl.dispose();
    _timeCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isP2P = widget.flow.tripDirection == 'POINT_TO_POINT';

    if (isP2P) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Trip & Driver Notes',
              style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text('Optional — venue name, gate, or special instructions for driver.',
              style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
          const SizedBox(height: 24),
          TextFormField(
            controller: _airlineCtrl,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(
              labelText: 'Venue / Event Name',
              hintText: 'e.g. AT&T Stadium, Gaylord Texan, American Airlines Center',
            ),
            onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                  (d) => d.copyWith(airline: v),
                ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _notesCtrl,
            maxLines: 3,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(
              labelText: 'Driver Notes / Special Requests',
              hintText: 'e.g. Meet at Lot 4 entrance, extra luggage assistance needed',
            ),
            onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                  (d) => d.copyWith(notes: v),
                ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Flight Details',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Optional — helps your driver plan your pickup.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 24),
        TextFormField(
          controller: _airlineCtrl,
          style: const TextStyle(color: TColors.white),
          decoration: const InputDecoration(
            labelText: 'Airline',
            hintText: 'e.g. American Airlines',
          ),
          onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(airline: v),
              ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _timeCtrl,
          style: const TextStyle(color: TColors.white),
          keyboardType: TextInputType.datetime,
          decoration: const InputDecoration(
            labelText: 'Flight / Departure Time',
            hintText: 'e.g. 14:30',
          ),
          onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(departureTime: v),
              ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _notesCtrl,
          maxLines: 2,
          style: const TextStyle(color: TColors.white),
          decoration: const InputDecoration(
            labelText: 'Driver Notes',
            hintText: 'Optional instructions for driver',
          ),
          onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(notes: v),
              ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9 — Contact
// ─────────────────────────────────────────────────────────────────────────────

class _ContactStep extends ConsumerStatefulWidget {
  final BookingFlowData flow;
  const _ContactStep({required this.flow});

  @override
  ConsumerState<_ContactStep> createState() => _ContactStepState();
}

class _ContactStepState extends ConsumerState<_ContactStep> {
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: widget.flow.phoneNumber ?? '');
    _emailCtrl = TextEditingController(text: widget.flow.email ?? '');
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Contact Information',
            style: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('We\'ll send your booking confirmation and QR code here.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 24),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: TColors.white),
          decoration: const InputDecoration(
            labelText: 'Phone Number *',
            hintText: '+1 (555) 000-0000',
          ),
          onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(phoneNumber: v),
              ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: TColors.white),
          decoration: const InputDecoration(
            labelText: 'Email (optional)',
            hintText: 'you@example.com',
          ),
          onChanged: (v) => ref.read(bookingFlowProvider.notifier).update(
                (d) => d.copyWith(email: v),
              ),
        ),
        const SizedBox(height: 24),
        // Price summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TColors.bgCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: TColors.border),
          ),
          child: Column(
            children: [
              _SummaryRow('Ride Total', '\$${(99.0 * ref.read(bookingFlowProvider).vanCount).toStringAsFixed(2)}'),
              const Divider(color: TColors.border, height: 16),
              _SummaryRow('Payment', 'Stripe — secure checkout', isGold: false),
            ],
          ),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isGold;

  const _SummaryRow(this.label, this.value, {this.isGold = true});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
        Text(value,
            style: TextStyle(
                color: isGold ? TColors.gold : TColors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700)),
      ],
    );
  }
}
