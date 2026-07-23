import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

import 'app.dart';
import 'core/config/app_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0A0A0A),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const _AppInit());
}

class _AppInit extends StatefulWidget {
  const _AppInit();

  @override
  State<_AppInit> createState() => _AppInitState();
}

class _AppInitState extends State<_AppInit> {
  bool _ready = false;
  String _stage = 'Starting TRAQQ';
  String? _fatalError;
  String? _fatalStage;
  String? _stripeWarning;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  void _setStage(String stage) {
    if (mounted) setState(() => _stage = stage);
  }

  Future<void> _bootstrap() async {
    // Firebase + Crashlytics — native only. Crashlytics has no web
    // implementation, and the web demo has no Firebase web config, so
    // failures here must never block the browser build from loading.
    if (!kIsWeb) {
      _setStage('Initializing services');
      try {
        await Firebase.initializeApp().timeout(const Duration(seconds: 20));
        if (!kDebugMode) {
          FlutterError.onError =
              FirebaseCrashlytics.instance.recordFlutterFatalError;
          PlatformDispatcher.instance.onError = (error, stack) {
            FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
            return true;
          };
        }
      } catch (e) {
        if (mounted) {
          setState(() { _fatalStage = _stage; _fatalError = e.toString(); });
        }
        return;
      }
    }

    // Stripe — non-blocking. On web, flutter_stripe's native PaymentSheet
    // is unsupported, so checkout uses a demo-mode fallback instead and
    // there's no need to initialize the SDK here.
    if (!kIsWeb) {
      _setStage('Preparing payment');
      try {
        Stripe.publishableKey = AppConfig.stripePublishableKey;
        await Stripe.instance.applySettings().timeout(const Duration(seconds: 15));
      } catch (e) {
        debugPrint('Stripe init warning: $e');
        if (mounted) setState(() => _stripeWarning = e.toString());
      }
    }

    _setStage('Loading app');
    await Future.delayed(const Duration(milliseconds: 150));
    if (mounted) setState(() => _ready = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_fatalError != null) {
      return _shell(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline,
                color: Color(0xFFC9A84C), size: 48),
            const SizedBox(height: 16),
            const Text('TRAQQ',
                style: TextStyle(
                    color: Color(0xFFC9A84C),
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 4)),
            const SizedBox(height: 8),
            Text('Startup failed at: ${_fatalStage ?? _stage}',
                style: const TextStyle(color: Colors.white54, fontSize: 12),
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
              ),
              child: Text(_fatalError!,
                  style: const TextStyle(
                      color: Colors.redAccent, fontSize: 11, height: 1.5)),
            ),
          ],
        ),
      );
    }

    if (!_ready) {
      return _shell(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('TRAQQ',
                style: TextStyle(
                    color: Color(0xFFC9A84C),
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 4)),
            const SizedBox(height: 32),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                  color: Color(0xFFC9A84C), strokeWidth: 2),
            ),
            const SizedBox(height: 16),
            Text(_stage,
                style:
                    const TextStyle(color: Colors.white54, fontSize: 13)),
            if (_stripeWarning != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                      color: Colors.orange.withValues(alpha: 0.35)),
                ),
                child: Text('Payment system: $_stripeWarning',
                    style: const TextStyle(
                        color: Colors.orange, fontSize: 10, height: 1.4),
                    textAlign: TextAlign.center),
              ),
            ],
          ],
        ),
      );
    }

    return const ProviderScope(child: TraqqApp());
  }

  Widget _shell({required Widget child}) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
