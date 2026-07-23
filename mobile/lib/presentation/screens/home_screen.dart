import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../providers/providers.dart';
import '../theme/app_theme.dart';

// ─── Gradient text helper ────────────────────────────────────────────────────

Widget _gradientText(String text, TextStyle style,
    {TextAlign textAlign = TextAlign.start}) {
  return ShaderMask(
    shaderCallback: (bounds) => const LinearGradient(
      colors: [
        Color(0xFFFFFFFF),
        Color(0xFFF7D36A),
        Color(0xFFD4AF37),
        Color(0xFFFFFFFF),
      ],
      stops: [0.0, 0.42, 0.70, 1.0],
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
    ).createShader(bounds),
    blendMode: BlendMode.srcIn,
    child: Text(text, style: style, textAlign: textAlign),
  );
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: TColors.bg,
      drawer: _NavDrawer(isAuthenticated: auth.isAuthenticated),
      body: Builder(
        builder: (ctx) => SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TopBar(
                isAuthenticated: auth.isAuthenticated,
                onMenuTap: () => Scaffold.of(ctx).openDrawer(),
              ),
              const _HeroSection(),
              const _TrustMarquee(),
              const _ServicesSection(),
              const _BookInMinutesSection(),
              const _WhyTraqqSection(),
              const _TerminalsSection(),
              const _FaqPreviewSection(),
              const _FinalCtaSection(),
              const _SiteFooter(),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Top Bar ────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final bool isAuthenticated;
  final VoidCallback onMenuTap;
  const _TopBar({required this.isAuthenticated, required this.onMenuTap});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Container(
        height: 58,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: const Color(0xD90A0A0A),
          border: Border(bottom: BorderSide(color: TColors.border)),
        ),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => context.go('/home'),
              child: Image.asset(
                'assets/images/logo.png',
                height: 28,
                fit: BoxFit.fitHeight,
                errorBuilder: (_, __, ___) => const Text('TRAQQ',
                    style: TextStyle(
                        color: TColors.gold,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2)),
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () => context.push('/booking'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: TColors.gold,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('Book Now',
                    style: TextStyle(
                        color: Colors.black,
                        fontSize: 12,
                        fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onMenuTap,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(
                    3,
                    (_) => Container(
                      margin: const EdgeInsets.symmetric(vertical: 2.5),
                      width: 22,
                      height: 2,
                      decoration: BoxDecoration(
                          color: TColors.whiteMuted,
                          borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Nav Drawer ─────────────────────────────────────────────────────────────

class _NavDrawer extends ConsumerWidget {
  final bool isAuthenticated;
  const _NavDrawer({required this.isAuthenticated});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void nav(String route) {
      Navigator.pop(context);
      context.push(route);
    }

    return Drawer(
      backgroundColor: const Color(0xFF111111),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
              child: Image.asset(
                'assets/images/logo.png',
                height: 32,
                fit: BoxFit.fitHeight,
                alignment: Alignment.centerLeft,
                errorBuilder: (_, __, ___) => const Text('TRAQQ',
                    style: TextStyle(
                        color: TColors.gold,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2)),
              ),
            ),
            Divider(color: TColors.border, height: 1),
            const SizedBox(height: 4),
            _tile(Icons.home_outlined, 'Home', () => nav('/home')),
            _tile(Icons.directions_car_outlined, 'Book a Ride',
                () => nav('/booking')),
            _tile(Icons.help_outline_rounded, 'How It Works',
                () => nav('/how-it-works')),
            _tile(Icons.info_outline_rounded, 'About TRAQQ',
                () => nav('/about')),
            _tile(Icons.quiz_outlined, 'FAQ', () => nav('/faq')),
            _tile(Icons.card_giftcard_rounded, 'Packages',
                () => nav('/packages')),
            _tile(Icons.contact_support_outlined, 'Contact',
                () => nav('/contact')),
            Divider(color: TColors.border, height: 20),
            if (isAuthenticated) ...[
              _tile(Icons.receipt_long_rounded, 'My Bookings',
                  () => nav('/history')),
              ListTile(
                leading: const Icon(Icons.logout_rounded,
                    color: TColors.error, size: 20),
                title: const Text('Sign Out',
                    style: TextStyle(
                        color: TColors.error,
                        fontSize: 14,
                        fontWeight: FontWeight.w500)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                onTap: () async {
                  Navigator.pop(context);
                  await ref.read(authProvider.notifier).signOut();
                },
              ),
            ] else
              _tile(Icons.login_rounded, 'Sign In', () => nav('/login')),
            const Spacer(),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Text('© 2025 TRAQQ. DFW Airport area.',
                  style: TextStyle(color: TColors.whiteFaint, fontSize: 11)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: TColors.whiteMuted, size: 20),
      title: Text(label,
          style: const TextStyle(
              color: TColors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500)),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
      onTap: onTap,
    );
  }
}

// ─── Hero Section ───────────────────────────────────────────────────────────

class _HeroSection extends StatelessWidget {
  const _HeroSection();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/Home.png',
            fit: BoxFit.cover,
            alignment: Alignment.topCenter,
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC0A0A0A),
                  Color(0x800A0A0A),
                  Color(0xCC0A0A0A),
                ],
                stops: [0.0, 0.45, 1.0],
              ),
            ),
          ),
          Positioned.fill(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'PREMIUM AIRPORT TRANSPORTATION',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: TColors.gold,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 2),
                      ),
                      const SizedBox(height: 20),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [
                            Color(0xFFFFFFFF),
                            Color(0xFFF7D36A),
                            Color(0xFFD4AF37),
                            Color(0xFFFFFFFF),
                          ],
                          stops: [0.0, 0.42, 0.70, 1.0],
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                        ).createShader(bounds),
                        blendMode: BlendMode.srcIn,
                        child: Text(
                          'Door-to-Door\nDFW Shuttle',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.playfairDisplay(
                            fontSize: 46,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            height: 1.1,
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      const Text(
                        'Private airport transportation for up to 6 passengers.'
                        '\nFlat \$99 rate. Smooth service to or from DFW Airport.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: Color(0xBBA0A0A0),
                            fontSize: 14,
                            height: 1.8),
                      ),
                      const SizedBox(height: 36),
                      Builder(builder: (ctx) => Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: TColors.gold,
                                foregroundColor: Colors.black,
                                minimumSize:
                                    const Size(double.infinity, 52),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8)),
                                textStyle: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700),
                              ),
                              onPressed: () => ctx.push('/booking'),
                              child: const Text('Book Your Ride'),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: TColors.whiteMuted,
                                minimumSize:
                                    const Size(double.infinity, 52),
                                side: const BorderSide(
                                    color: TColors.border),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8)),
                                textStyle: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500),
                              ),
                              onPressed: () =>
                                  ctx.push('/how-it-works'),
                              child: const Text('How It Works'),
                            ),
                          ),
                        ],
                      )),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Positioned(
            bottom: 24,
            left: 0,
            right: 0,
            child: Center(
              child: Icon(Icons.keyboard_arrow_down_rounded,
                  color: TColors.whiteFaint, size: 28),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Trust Marquee ──────────────────────────────────────────────────────────

class _TrustMarquee extends StatefulWidget {
  const _TrustMarquee();

  @override
  State<_TrustMarquee> createState() => _TrustMarqueeState();
}

class _TrustMarqueeState extends State<_TrustMarquee>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  static const _items = [
    (Icons.local_offer_outlined, 'Flat \$99 Rate'),
    (Icons.directions_car_outlined, 'Private Shuttle'),
    (Icons.group_outlined, 'Up to 6 Passengers'),
    (Icons.flight_outlined, 'DFW Airport Service'),
    (Icons.security_outlined, 'Secure Checkout'),
    (Icons.check_circle_outline, 'No Hidden Fees'),
  ];

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 28),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  List<Widget> _buildItems() => _items
      .map((item) => Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(item.$1, color: TColors.gold, size: 12),
                const SizedBox(width: 6),
                Text(
                  item.$2.toUpperCase(),
                  style: const TextStyle(
                      color: TColors.gold,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.0),
                ),
              ],
            ),
          ))
      .toList();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: TColors.gold.withValues(alpha: 0.05),
        border: Border.symmetric(
            horizontal:
                BorderSide(color: TColors.gold.withValues(alpha: 0.18))),
      ),
      clipBehavior: Clip.hardEdge,
      child: AnimatedBuilder(
        animation: _ctrl,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [..._buildItems(), ..._buildItems()],
        ),
        builder: (_, child) => OverflowBox(
          maxWidth: double.infinity,
          alignment: Alignment.centerLeft,
          child: FractionalTranslation(
            translation: Offset(-_ctrl.value * 0.5, 0),
            child: child,
          ),
        ),
      ),
    );
  }
}

// ─── Services Section ───────────────────────────────────────────────────────

class _ServicesSection extends StatelessWidget {
  const _ServicesSection();

  static const _cards = [
    (Icons.meeting_room_outlined, 'Door-to-Door Pickup',
        'Get picked up from your exact location and ride directly to DFW Airport with no shared stops, no detours, and no delays.'),
    (Icons.attach_money_rounded, 'Flat \$99 Rate',
        'Simple transparent pricing. No hidden fees, no surge pricing, no surprises. What you see at booking is exactly what you pay.'),
    (Icons.group_outlined, 'Up to 6 Passengers',
        'Perfect for families, business travelers, small groups, and airport transfers — all in one private, comfortable ride.'),
    (Icons.qr_code_rounded, 'QR Confirmation',
        'Receive a confirmed booking with a unique QR code after successful payment — your digital boarding pass for the shuttle.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('OUR SERVICES',
              style: TextStyle(
                  color: TColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2)),
          const SizedBox(height: 12),
          _gradientText(
            'Private Airport Transportation,\nDesigned Around You',
            const TextStyle(
                fontSize: 26, fontWeight: FontWeight.w700, height: 1.2),
          ),
          const SizedBox(height: 28),
          ..._cards.map((c) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _ServiceCard(icon: c.$1, title: c.$2, desc: c.$3),
              )),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  const _ServiceCard(
      {required this.icon, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161616),
        border: Border.all(color: TColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: TColors.goldDim,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: TColors.gold.withValues(alpha: 0.25)),
            ),
            child: Icon(icon, color: TColors.gold, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: TColors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(desc,
                    style: const TextStyle(
                        color: TColors.whiteMuted,
                        fontSize: 13,
                        height: 1.6)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Book In Minutes Section ─────────────────────────────────────────────────

class _BookInMinutesSection extends StatelessWidget {
  const _BookInMinutesSection();

  static const _steps = [
    (Icons.calendar_today_outlined, '01', 'Select Your Schedule',
        'Choose your pickup date and time with clear real-time availability.'),
    (Icons.location_on_outlined, '02', 'Add Trip Details',
        'Enter your pickup address, passenger count, luggage, and DFW terminal.'),
    (Icons.receipt_outlined, '03', 'Review Flat Rate',
        'Confirm your private shuttle details with a transparent \$99 flat rate.'),
    (Icons.credit_card_outlined, '04', 'Pay Securely',
        'Complete checkout using secure Stripe payment processing.'),
    (Icons.qr_code_rounded, '05', 'Receive Confirmation',
        'Get your confirmed booking details and QR code after payment.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF111111),
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('SIMPLE PROCESS',
              style: TextStyle(
                  color: TColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2)),
          const SizedBox(height: 12),
          _gradientText(
            'Book Your Ride\nin Minutes',
            const TextStyle(
                fontSize: 26, fontWeight: FontWeight.w700, height: 1.2),
          ),
          const SizedBox(height: 12),
          const Text(
            'A streamlined airport shuttle experience designed for comfort, clarity, and confidence — from booking to confirmation.',
            style: TextStyle(
                color: TColors.whiteMuted, fontSize: 14, height: 1.75),
          ),
          const SizedBox(height: 28),
          ..._steps.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161616),
                    border: Border.all(color: TColors.border),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: TColors.goldDim,
                          shape: BoxShape.circle,
                          border: Border.all(
                              color:
                                  TColors.gold.withValues(alpha: 0.28)),
                        ),
                        child: Center(
                          child: Text(s.$2,
                              style: const TextStyle(
                                  color: TColors.gold,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(s.$1, color: TColors.gold, size: 16),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s.$3,
                                style: const TextStyle(
                                    color: TColors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700)),
                            Text(s.$4,
                                style: const TextStyle(
                                    color: TColors.whiteMuted,
                                    fontSize: 12,
                                    height: 1.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )),
          const SizedBox(height: 24),
          // book.png image card
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                  color: TColors.gold.withValues(alpha: 0.22)),
              borderRadius: BorderRadius.circular(16),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                Image.asset('assets/images/book.png',
                    width: double.infinity, fit: BoxFit.cover),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: TColors.gold.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star_rounded,
                            color: Colors.black, size: 12),
                        SizedBox(width: 4),
                        Text('Premium Booking Experience',
                            style: TextStyle(
                                color: Colors.black,
                                fontSize: 10,
                                fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _trust(Icons.local_offer_outlined, 'Flat \$99 Rate'),
              _trust(Icons.security_outlined, 'Secure Checkout'),
              _trust(Icons.qr_code_rounded, 'QR Confirmation'),
            ],
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: TColors.gold,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
              onPressed: () => context.push('/booking'),
              child: const Text('Book Now — \$99'),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text(
                'Private DFW shuttle service for up to 6 passengers.',
                style: TextStyle(
                    color: TColors.whiteMuted, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _trust(IconData icon, String label) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF161616),
          border: Border.all(color: TColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: TColors.gold, size: 12),
            const SizedBox(width: 5),
            Text(label,
                style: const TextStyle(
                    color: TColors.whiteMuted, fontSize: 10)),
          ],
        ),
      );
}

// ─── Why TRAQQ Section ──────────────────────────────────────────────────────

class _WhyTraqqSection extends StatelessWidget {
  const _WhyTraqqSection();

  static const _items = [
    (Icons.star_outline_rounded, 'Private, Premium Experience',
        'Your group only. No shared rides, no strangers, no unexpected stops.'),
    (Icons.security_outlined, 'Professional Airport Service',
        'Courteous, punctual drivers who know DFW Airport inside and out.'),
    (Icons.phone_android_outlined, 'Smooth Online Booking',
        'Book in under 2 minutes — no app download, no account required for guests.'),
    (Icons.lock_outline_rounded, 'Secure Stripe Payments',
        'Industry-standard payment processing. Your card data is never stored on our servers.'),
    (Icons.task_alt_rounded, 'Clear Confirmation Flow',
        'QR code issued immediately after payment. No waiting, no confusion.'),
    (Icons.flight_rounded, 'Built for DFW Travelers',
        'Specialized service covering all five DFW terminals — A, B, C, D, and E.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('WHY TRAQQ',
              style: TextStyle(
                  color: TColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2)),
          const SizedBox(height: 12),
          _gradientText(
            'Why Travelers Choose TRAQQ',
            const TextStyle(
                fontSize: 24, fontWeight: FontWeight.w700, height: 1.2),
          ),
          const SizedBox(height: 24),
          ..._items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161616),
                    border: Border.all(color: TColors.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: TColors.goldDim,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(item.$1, color: TColors.gold, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.$2,
                                style: const TextStyle(
                                    color: TColors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(item.$3,
                                style: const TextStyle(
                                    color: TColors.whiteMuted,
                                    fontSize: 12,
                                    height: 1.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }
}

// ─── Terminals Section ──────────────────────────────────────────────────────

class _TerminalsSection extends StatelessWidget {
  const _TerminalsSection();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF111111),
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('COVERAGE',
              style: TextStyle(
                  color: TColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2)),
          const SizedBox(height: 12),
          _gradientText(
            'Serving Dallas Fort Worth\nInternational Airport',
            const TextStyle(
                fontSize: 24, fontWeight: FontWeight.w700, height: 1.2),
          ),
          const SizedBox(height: 14),
          const Text(
            'TRAQQ provides private door-to-door airport shuttle service for all DFW Airport terminals. Select your terminal during booking and your driver will take you directly there.',
            style: TextStyle(
                color: TColors.whiteMuted, fontSize: 13, height: 1.7),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: ['Terminal A', 'Terminal B', 'Terminal C', 'Terminal D', 'Terminal E']
                .map((t) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF161616),
                        border: Border.all(
                            color: TColors.gold.withValues(alpha: 0.3)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                  color: TColors.gold,
                                  shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Text(t,
                              style: const TextStyle(
                                  color: TColors.gold,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

// ─── FAQ Preview Section ─────────────────────────────────────────────────────

class _FaqPreviewSection extends StatelessWidget {
  const _FaqPreviewSection();

  static const _faqs = [
    ('01', 'Is the \$99 price per person?',
        'No. \$99 is the flat rate for the entire shuttle for up to 6 passengers. Split it with your group and it\'s exceptional value.'),
    ('02', 'Do I need an account to book?',
        'No account required. You can book as a guest using just your phone number. Creating an account lets you view your booking history.'),
    ('03', 'What happens after I pay?',
        'Your booking is instantly confirmed and a unique QR code is generated for your ride — show it to your driver at pickup.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('COMMON QUESTIONS',
              style: TextStyle(
                  color: TColors.gold,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2)),
          const SizedBox(height: 12),
          _gradientText(
            'Quick Answers',
            const TextStyle(
                fontSize: 24, fontWeight: FontWeight.w700, height: 1.2),
          ),
          const SizedBox(height: 24),
          ..._faqs.map((faq) => Container(
                padding: const EdgeInsets.symmetric(vertical: 18),
                decoration: const BoxDecoration(
                    border: Border(
                        bottom: BorderSide(color: TColors.border))),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(faq.$1,
                        style: const TextStyle(
                            color: TColors.gold,
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(faq.$2,
                              style: const TextStyle(
                                  color: TColors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          Text(faq.$3,
                              style: const TextStyle(
                                  color: TColors.whiteMuted,
                                  fontSize: 13,
                                  height: 1.6)),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 24),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: TColors.whiteMuted,
              side: const BorderSide(color: TColors.border),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 12),
            ),
            onPressed: () => context.push('/faq'),
            child: const Text('View All FAQs →'),
          ),
        ],
      ),
    );
  }
}

// ─── Final CTA Section ──────────────────────────────────────────────────────

class _FinalCtaSection extends StatelessWidget {
  const _FinalCtaSection();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 24),
      decoration: const BoxDecoration(
        color: TColors.bg,
        border: Border(top: BorderSide(color: TColors.border)),
      ),
      child: Column(
        children: [
          _gradientText(
            'Ready for a smoother airport ride?',
            const TextStyle(
                fontSize: 26, fontWeight: FontWeight.w700, height: 1.2),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          const Text(
            'Book your private DFW shuttle today for one flat rate — no surprises, no sharing.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: TColors.whiteMuted, fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: TColors.gold,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
              onPressed: () => context.push('/booking'),
              child: const Text('Book Now — \$99'),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: TColors.whiteMuted,
                minimumSize: const Size(double.infinity, 52),
                side: const BorderSide(color: TColors.border),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w500),
              ),
              onPressed: () => context.push('/contact'),
              child: const Text('Contact Us'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Site Footer ─────────────────────────────────────────────────────────────

class _SiteFooter extends StatelessWidget {
  const _SiteFooter();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF111111),
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.asset(
            'assets/images/logo.png',
            height: 30,
            fit: BoxFit.fitHeight,
            errorBuilder: (_, __, ___) => const Text('TRAQQ',
                style: TextStyle(
                    color: TColors.gold,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2)),
          ),
          const SizedBox(height: 10),
          const Text(
            'Premium private shuttle to DFW Airport.\nFlat rate \$99. No surprises.',
            style: TextStyle(
                color: TColors.whiteMuted, fontSize: 13, height: 1.6),
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () => context.push('/booking'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                  color: TColors.gold,
                  borderRadius: BorderRadius.circular(6)),
              child: const Text('Book a Ride',
                  style: TextStyle(
                      color: Colors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 16),
          const Text('support@mytraqq.com',
              style: TextStyle(color: TColors.gold, fontSize: 13)),
          const SizedBox(height: 4),
          const Text('5860 Collin McKinney Pkwy, Suite 605',
              style: TextStyle(color: TColors.whiteMuted, fontSize: 12)),
          const Text('McKinney, TX 75070',
              style: TextStyle(color: TColors.whiteMuted, fontSize: 12)),
          const Text('Serving Dallas Fort Worth, TX',
              style: TextStyle(color: TColors.whiteMuted, fontSize: 12)),
          const SizedBox(height: 28),
          const Divider(color: TColors.border),
          const SizedBox(height: 16),
          _section(context, 'Quick Links', [
            ('Home', '/home'),
            ('Book a Ride', '/booking'),
            ('How It Works', '/how-it-works'),
            ('About TRAQQ', '/about'),
            ('FAQ', '/faq'),
            ('Contact', '/contact'),
          ]),
          const SizedBox(height: 20),
          _section(context, 'Legal', [
            ('Terms of Service', '/terms'),
            ('Privacy Policy', '/privacy'),
            ('Cancellation Policy', '/cancellation-policy'),
          ]),
          const SizedBox(height: 24),
          const Divider(color: TColors.border),
          const SizedBox(height: 12),
          const Text(
              '© 2025 TRAQQ. All rights reserved. DFW Airport area.',
              style: TextStyle(color: TColors.whiteFaint, fontSize: 11)),
          const SizedBox(height: 4),
          const Text(
              'Not affiliated with Dallas/Fort Worth International Airport.',
              style: TextStyle(color: TColors.whiteFaint, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _section(BuildContext context, String title,
      List<(String, String)> links) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(),
            style: const TextStyle(
                color: TColors.whiteMuted,
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5)),
        const SizedBox(height: 10),
        ...links.map((l) => GestureDetector(
              onTap: () => context.push(l.$2),
              child: Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(l.$1,
                    style: const TextStyle(
                        color: TColors.whiteMuted, fontSize: 13)),
              ),
            )),
      ],
    );
  }
}
