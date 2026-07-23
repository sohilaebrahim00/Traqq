import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final String bookingId;
  final String bookingRef;
  final int amountCents;

  const CheckoutScreen({
    super.key,
    required this.bookingId,
    required this.bookingRef,
    required this.amountCents,
  });

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _loading = false;
  String? _error;

  // Promo code state
  final _promoCtrl = TextEditingController();
  bool _promoLoading = false;
  String? _promoError;
  String? _promoApplied;
  int _discountCents = 0;

  @override
  void dispose() {
    _promoCtrl.dispose();
    super.dispose();
  }

  int get _finalCents => (widget.amountCents - _discountCents).clamp(0, widget.amountCents);
  double get _finalDollars => _finalCents / 100.0;
  double get _originalDollars => widget.amountCents / 100.0;

  Future<void> _applyPromo() async {
    final code = _promoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() { _promoLoading = true; _promoError = null; });
    try {
      final ds = ref.read(bookingDataSourceProvider);
      final result = await ds.applyPromo(code: code, bookingId: widget.bookingId);
      final discount = result['discountAmount'] as num? ?? result['discount'] as num? ?? 0;
      final discountCents = (discount * 100).round();
      setState(() {
        _promoLoading = false;
        _promoApplied = code;
        _discountCents = discountCents;
        _promoError = null;
      });
    } catch (e) {
      setState(() {
        _promoLoading = false;
        _promoError = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _pay() async {
    if (kIsWeb) {
      await _payWeb();
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final ds = ref.read(paymentDataSourceProvider);
      final intent = await ds.createIntent(widget.bookingId);

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: intent.clientSecret,
          merchantDisplayName: 'TRAQQ Shuttle',
          style: ThemeMode.dark,
        ),
      );

      await Stripe.instance.presentPaymentSheet();

      if (mounted) {
        context.go('/booking-details/${widget.bookingId}');
      }
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) {
        setState(() { _loading = false; _error = null; });
      } else {
        setState(() {
          _loading = false;
          _error = e.error.localizedMessage ?? 'Payment failed. Please try again.';
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  /// Web demo fallback: flutter_stripe's native PaymentSheet UI only runs
  /// on Android/iOS. Card payment isn't available in the browser preview,
  /// so this creates the real PaymentIntent (proving the backend call
  /// works) then lets the client continue to booking details without
  /// collecting card details.
  Future<void> _payWeb() async {
    setState(() { _loading = true; _error = null; });
    try {
      final ds = ref.read(paymentDataSourceProvider);
      await ds.createIntent(widget.bookingId);
      if (!mounted) return;
      setState(() => _loading = false);

      final continueDemo = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: TColors.bgCard,
          title: const Text('Web Preview', style: TextStyle(color: TColors.gold)),
          content: const Text(
            'Card payment requires the native TRAQQ app (iOS/Android) — the '
            'secure payment sheet isn\'t available in a browser preview. '
            'Continue to see the rest of the booking flow.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Continue (Demo)'),
            ),
          ],
        ),
      );

      if (continueDemo == true && mounted) {
        context.go('/booking-details/${widget.bookingId}');
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Checkout'),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),

              // Order summary
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: TColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('ORDER SUMMARY',
                        style: TextStyle(
                            color: TColors.gold, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2)),
                    const SizedBox(height: 14),
                    _LineItem('TRAQQ Private Transfer', '\$${_originalDollars.toStringAsFixed(2)}'),
                    if (_discountCents > 0)
                      _LineItem('Promo ($_promoApplied)', '−\$${(_discountCents / 100.0).toStringAsFixed(2)}',
                          valueColor: TColors.success),
                    const Divider(color: TColors.border, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total',
                            style: TextStyle(
                                color: TColors.white, fontSize: 15, fontWeight: FontWeight.w700)),
                        Text('\$${_finalDollars.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: TColors.gold, fontSize: 18, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Booking ref
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: TColors.bgElevated,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.confirmation_num_rounded, color: TColors.whiteMuted, size: 16),
                    const SizedBox(width: 10),
                    Text('Booking: ${widget.bookingRef}',
                        style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Promo code
              if (_promoApplied == null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: TColors.bgCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: TColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PROMO CODE',
                          style: TextStyle(
                              color: TColors.whiteMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.5)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _promoCtrl,
                              textCapitalization: TextCapitalization.characters,
                              style: const TextStyle(color: TColors.white, fontSize: 14),
                              decoration: const InputDecoration(
                                hintText: 'Enter code',
                                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              ),
                              onFieldSubmitted: (_) => _applyPromo(),
                            ),
                          ),
                          const SizedBox(width: 10),
                          OutlinedButton(
                            onPressed: _promoLoading ? null : _applyPromo,
                            child: _promoLoading
                                ? const SizedBox(
                                    width: 16, height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: TColors.gold))
                                : const Text('Apply'),
                          ),
                        ],
                      ),
                      if (_promoError != null) ...[
                        const SizedBox(height: 8),
                        Text(_promoError!,
                            style: const TextStyle(color: TColors.error, fontSize: 12)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ] else ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: TColors.success.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: TColors.success.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: TColors.success, size: 16),
                      const SizedBox(width: 8),
                      Text('Promo "$_promoApplied" applied ✓',
                          style: const TextStyle(color: TColors.success, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Trust badges
              Row(
                children: [
                  _TrustBadge(Icons.verified_rounded, 'No hidden fees'),
                  const SizedBox(width: 10),
                  _TrustBadge(Icons.cancel_outlined, 'Free cancel 24h+'),
                ],
              ),

              const SizedBox(height: 20),

              // Stripe note
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock_rounded, color: TColors.whiteFaint, size: 12),
                  SizedBox(width: 6),
                  Text('Secured by Stripe',
                      style: TextStyle(color: TColors.whiteFaint, fontSize: 11)),
                ],
              ),
              const SizedBox(height: 12),

              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: TColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: TColors.error.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: TColors.error, fontSize: 13)),
                ),

              TraqqButton(
                label: 'Pay \$${_finalDollars.toStringAsFixed(2)}',
                icon: Icons.credit_card_rounded,
                isLoading: _loading,
                onPressed: _pay,
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _LineItem extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _LineItem(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: TColors.whiteMuted, fontSize: 14)),
            Text(value,
                style: TextStyle(
                    color: valueColor ?? TColors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      );
}

class _TrustBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustBadge(this.icon, this.label);

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: TColors.bgCard,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: TColors.border),
          ),
          child: Row(
            children: [
              Icon(icon, color: TColors.gold, size: 14),
              const SizedBox(width: 6),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        color: TColors.whiteMuted, fontSize: 11, fontWeight: FontWeight.w500)),
              ),
            ],
          ),
        ),
      );
}
