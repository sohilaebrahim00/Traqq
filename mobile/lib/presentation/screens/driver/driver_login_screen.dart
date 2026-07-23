import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';

class DriverLoginScreen extends ConsumerStatefulWidget {
  const DriverLoginScreen({super.key});

  @override
  ConsumerState<DriverLoginScreen> createState() => _DriverLoginScreenState();
}

class _DriverLoginScreenState extends ConsumerState<DriverLoginScreen> {
  final _formKey        = GlobalKey<FormState>();
  final _identifierCtrl = TextEditingController();
  final _passwordCtrl   = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    ref.read(authProvider.notifier).clearError();

    final ok = await ref.read(authProvider.notifier).driverLogin(
          identifier: _identifierCtrl.text.trim(),
          password: _passwordCtrl.text,
        );

    if (ok && mounted) context.go('/driver/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                const Text('TRAQQ',
                    style: TextStyle(
                        color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 3)),
                const SizedBox(height: 12),
                const Text('Driver Portal',
                    style: TextStyle(color: TColors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('Sign in with your email or phone number.',
                    style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
                const SizedBox(height: 40),

                TextFormField(
                  controller: _identifierCtrl,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  style: const TextStyle(color: TColors.white),
                  decoration: const InputDecoration(
                    labelText: 'Email or Phone',
                    hintText: 'driver@mytraqq.com or +1...',
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Email or phone is required.' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _passwordCtrl,
                  obscureText: _obscure,
                  style: const TextStyle(color: TColors.white),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility,
                          color: TColors.whiteMuted, size: 20),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Password is required.' : null,
                ),
                const SizedBox(height: 12),

                if (auth.error != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: TColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: TColors.error.withOpacity(0.3)),
                    ),
                    child: Text(
                      auth.error!.replaceAll('Exception: ', '').replaceAll('ApiException(401): ', ''),
                      style: const TextStyle(color: TColors.error, fontSize: 13),
                    ),
                  ),

                const SizedBox(height: 8),
                TraqqButton(
                  label: 'Sign In as Driver',
                  isLoading: auth.isLoading,
                  onPressed: _submit,
                ),
                const SizedBox(height: 32),
                const Divider(color: TColors.border),
                const SizedBox(height: 16),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go('/login'),
                    child: const Text(
                      'Customer? Sign in here →',
                      style: TextStyle(color: TColors.whiteMuted, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
