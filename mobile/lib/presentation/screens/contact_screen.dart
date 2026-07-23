import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/providers.dart';
import '../theme/app_theme.dart';
import '../widgets/traqq_button.dart';

class ContactScreen extends ConsumerStatefulWidget {
  const ContactScreen({super.key});

  @override
  ConsumerState<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends ConsumerState<ContactScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _nameCtrl  = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _msgCtrl   = TextEditingController();
  String _type = 'General';
  bool _loading = false;
  bool _success = false;
  String? _error;

  static const _types = ['General', 'Booking Issue', 'Billing', 'Lost Item', 'Driver Complaint', 'Other'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final ds = ref.read(contactDataSourceProvider);
      await ds.send(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        type: _type,
        message: _msgCtrl.text.trim(),
      );
      setState(() { _success = true; _loading = false; });
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
      appBar: AppBar(title: const Text('Contact Us')),
      body: SafeArea(
        child: _success ? _buildSuccess() : _buildForm(),
      ),
    );
  }

  Widget _buildSuccess() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_rounded, color: TColors.success, size: 72),
            const SizedBox(height: 20),
            const Text('Message Sent',
                style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
              "We've received your message and will respond within 24 hours.",
              style: TextStyle(color: TColors.whiteMuted, fontSize: 14, height: 1.6),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            TraqqButton(
              label: 'Done',
              isOutlined: true,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("We're here to help",
                style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            const Text('Send us a message and we\'ll reply within 24 hours.',
                style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
            const SizedBox(height: 28),

            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              style: const TextStyle(color: TColors.white),
              decoration: const InputDecoration(labelText: 'Your Name *'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required.' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: TColors.white),
              decoration: const InputDecoration(labelText: 'Email *'),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Email is required.';
                if (!v.contains('@')) return 'Enter a valid email.';
                return null;
              },
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: TColors.white),
              decoration: const InputDecoration(labelText: 'Phone (optional)'),
            ),
            const SizedBox(height: 16),

            // Type dropdown
            DropdownButtonFormField<String>(
              value: _type,
              dropdownColor: TColors.bgCard,
              style: const TextStyle(color: TColors.white, fontSize: 14),
              decoration: const InputDecoration(labelText: 'Inquiry Type'),
              items: _types
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _type = v ?? 'General'),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _msgCtrl,
              style: const TextStyle(color: TColors.white),
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Message *',
                alignLabelWithHint: true,
              ),
              validator: (v) =>
                  (v == null || v.trim().length < 10) ? 'Message must be at least 10 characters.' : null,
            ),
            const SizedBox(height: 24),

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
              label: 'Send Message',
              isLoading: _loading,
              onPressed: _submit,
            ),

            const SizedBox(height: 24),
            const Divider(color: TColors.border),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.email_outlined, color: TColors.whiteMuted, size: 16),
                SizedBox(width: 10),
                Text('support@mytraqq.com',
                    style: TextStyle(color: TColors.whiteMuted, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}
