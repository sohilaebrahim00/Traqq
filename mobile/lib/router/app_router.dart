import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../presentation/providers/providers.dart';
import '../presentation/screens/splash_screen.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/auth/register_screen.dart';
import '../presentation/screens/home_screen.dart';
import '../presentation/screens/booking/booking_flow_screen.dart';
import '../presentation/screens/booking/booking_history_screen.dart';
import '../presentation/screens/booking/booking_details_screen.dart';
import '../presentation/screens/booking/booking_tracking_screen.dart';
import '../presentation/screens/booking/edit_booking_screen.dart';
import '../presentation/screens/booking/checkout_screen.dart';
import '../presentation/screens/contact_screen.dart';
import '../presentation/screens/packages_screen.dart';
import '../presentation/screens/info/about_screen.dart';
import '../presentation/screens/info/how_it_works_screen.dart';
import '../presentation/screens/info/faq_screen.dart';
import '../presentation/screens/info/terms_screen.dart';
import '../presentation/screens/info/privacy_screen.dart';
import '../presentation/screens/info/cancellation_policy_screen.dart';
import '../presentation/screens/driver/driver_login_screen.dart';
import '../presentation/screens/driver/driver_dashboard_screen.dart';
import '../presentation/screens/driver/driver_booking_details_screen.dart';
import '../presentation/screens/driver/driver_profile_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isDriver = authState.isDriver;
      final path = state.uri.path;

      if (path == '/splash') return null;

      // Driver-only routes
      if (path.startsWith('/driver/') && path != '/driver/login') {
        if (!isAuthenticated || !isDriver) return '/driver/login';
      }

      // Customer-only protected routes
      if (path == '/history') {
        if (!isAuthenticated) return '/login';
        if (isDriver) return '/driver/dashboard';
      }

      // Authenticated driver hits customer auth pages
      if ((path == '/login' || path == '/register') && isAuthenticated && isDriver) {
        return '/driver/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const SplashScreen(),
      ),

      // ── Customer Auth ────────────────────────────────────────────────────
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (_, __) => const RegisterScreen(),
      ),

      // ── Customer App ─────────────────────────────────────────────────────
      GoRoute(
        path: '/home',
        builder: (_, __) => const HomeScreen(),
      ),
      GoRoute(
        path: '/booking',
        builder: (_, __) => const BookingFlowScreen(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return CheckoutScreen(
            bookingId: extra?['bookingId'] as String? ?? '',
            bookingRef: extra?['bookingRef'] as String? ?? '',
            amountCents: extra?['amountCents'] as int? ?? 9900,
          );
        },
      ),
      GoRoute(
        path: '/history',
        builder: (_, __) => const BookingHistoryScreen(),
      ),
      GoRoute(
        path: '/booking-details/:id',
        builder: (_, state) => BookingDetailsScreen(
          bookingId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/tracking/:id',
        builder: (_, state) => BookingTrackingScreen(
          bookingId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/edit-booking',
        builder: (_, __) => const EditBookingScreen(),
      ),
      GoRoute(
        path: '/contact',
        builder: (_, __) => const ContactScreen(),
      ),
      GoRoute(
        path: '/packages',
        builder: (_, __) => const PackagesScreen(),
      ),
      GoRoute(
        path: '/about',
        builder: (_, __) => const AboutScreen(),
      ),
      GoRoute(
        path: '/how-it-works',
        builder: (_, __) => const HowItWorksScreen(),
      ),
      GoRoute(
        path: '/faq',
        builder: (_, __) => const FaqScreen(),
      ),
      GoRoute(
        path: '/terms',
        builder: (_, __) => const TermsScreen(),
      ),
      GoRoute(
        path: '/privacy',
        builder: (_, __) => const PrivacyScreen(),
      ),
      GoRoute(
        path: '/cancellation-policy',
        builder: (_, __) => const CancellationPolicyScreen(),
      ),

      // ── Driver ───────────────────────────────────────────────────────────
      GoRoute(
        path: '/driver/login',
        builder: (_, __) => const DriverLoginScreen(),
      ),
      GoRoute(
        path: '/driver/dashboard',
        builder: (_, __) => const DriverDashboardScreen(),
      ),
      GoRoute(
        path: '/driver/booking-details/:id',
        builder: (_, state) => DriverBookingDetailsScreen(
          bookingId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/driver/profile',
        builder: (_, __) => const DriverProfileScreen(),
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Center(
        child: Text(
          'Page not found: ${state.uri.path}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    ),
  );
});
