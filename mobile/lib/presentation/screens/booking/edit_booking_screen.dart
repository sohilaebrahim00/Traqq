import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/traqq_button.dart';

enum _EditStep { lookup, verify, edit, success }

class EditBookingScreen extends ConsumerStatefulWidget {
  const EditBookingScreen({super.key});

  @override
  ConsumerState<EditBookingScreen> createState() => _EditBookingScreenState();
}

class _EditBookingScreenState extends ConsumerState<EditBookingScreen> {
  _EditStep _step = _EditStep.lookup;
  bool _loading = false;
  String? _error;

  // Lookup
  final _refCtrl   = TextEditingController();
  final _phoneCtrl = TextEditingController();

  // Booking data after lookup
  String?  _bookingRef;       // raw ref without TRQ- prefix
  String?  _displayRef;
  String?  _phoneMasked;
  String?  _status;
  DateTime? _pickupDatetime;
  String?  _pickupAddress;
  String?  _airline;

  // Edit form
  final _dateCtrl    = TextEditingController();
  final _timeCtrl    = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _airlineCtrl = TextEditingController();

  @override
  void dispose() {
    _refCtrl.dispose();
    _phoneCtrl.dispose();
    _dateCtrl.dispose();
    _timeCtrl.dispose();
    _addressCtrl.dispose();
    _airlineCtrl.dispose();
    super.dispose();
  }

  String _normalize(String ref) {
    final r = ref.trim().toUpperCase();
    return r.startsWith('TRQ-') ? r.substring(4) : r;
  }

  Future<void> _lookup() async {
    final rawRef = _refCtrl.text.trim();
    if (rawRef.isEmpty) { setState(() => _error = 'Enter a booking reference.'); return; }
    setState(() { _loading = true; _error = null; });

    try {
      final bookingRef = _normalize(rawRef);
      final ds = ref.read(bookingDataSourceProvider);
      final data = await ds.getBookingByRef(bookingRef);

      setState(() {
        _bookingRef   = bookingRef;
        _displayRef   = data['displayRef'] as String? ?? 'TRQ-$bookingRef';
        _phoneMasked  = data['phoneMasked'] as String? ?? '****';
        _status       = data['status'] as String?;
        final rawDt = data['pickupDatetime'];
        _pickupDatetime = rawDt != null ? DateTime.tryParse(rawDt as String) : null;
        _pickupAddress  = data['pickupAddress'] as String?;
        _airline        = data['airline'] as String?;
        _step    = _EditStep.verify;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _verify() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) { setState(() => _error = 'Enter your phone number.'); return; }

    // Verify by attempting the PATCH with an empty payload — backend
    // validates the phone number and returns 403 if it doesn't match.
    setState(() { _loading = true; _error = null; });
    try {
      final ds = ref.read(bookingDataSourceProvider);
      await ds.verifyBookingPhone(_bookingRef!, phone);

      // Prefill edit form
      if (_pickupDatetime != null) {
        _dateCtrl.text = '${_pickupDatetime!.year.toString().padLeft(4, '0')}-'
            '${_pickupDatetime!.month.toString().padLeft(2, '0')}-'
            '${_pickupDatetime!.day.toString().padLeft(2, '0')}';
        _timeCtrl.text = '${_pickupDatetime!.hour.toString().padLeft(2, '0')}:'
            '${_pickupDatetime!.minute.toString().padLeft(2, '0')}';
      }
      _addressCtrl.text = _pickupAddress ?? '';
      _airlineCtrl.text = _airline ?? '';

      setState(() { _step = _EditStep.edit; _loading = false; });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString().contains('403')
            ? 'Phone number does not match. Please try again.'
            : e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _save() async {
    setState(() { _loading = true; _error = null; });
    try {
      final ds = ref.read(bookingDataSourceProvider);
      await ds.updateBookingByRef(
        _bookingRef!,
        verifyPhone: _phoneCtrl.text.trim(),
        changes: {
          if (_dateCtrl.text.isNotEmpty) 'pickupDate': _dateCtrl.text,
          if (_timeCtrl.text.isNotEmpty) 'pickupTime': _timeCtrl.text,
          if (_addressCtrl.text.isNotEmpty) 'pickupAddress': _addressCtrl.text,
          if (_airlineCtrl.text.isNotEmpty) 'airline': _airlineCtrl.text,
        },
      );
      setState(() { _step = _EditStep.success; _loading = false; });
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
        leading: _step == _EditStep.lookup || _step == _EditStep.success
            ? CloseButton(onPressed: () => context.pop())
            : BackButton(onPressed: () => setState(() {
                  _error = null;
                  _step = _EditStep.values[_EditStep.values.indexOf(_step) - 1];
                })),
        title: Text(switch (_step) {
          _EditStep.lookup  => 'Edit Booking',
          _EditStep.verify  => 'Verify Identity',
          _EditStep.edit    => 'Edit Booking',
          _EditStep.success => 'Changes Saved',
        }),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: switch (_step) {
            _EditStep.lookup  => _buildLookup(),
            _EditStep.verify  => _buildVerify(),
            _EditStep.edit    => _buildEdit(),
            _EditStep.success => _buildSuccess(),
          },
        ),
      ),
    );
  }

  Widget _buildLookup() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Find your booking',
            style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Enter your booking reference number.',
            style: TextStyle(color: TColors.whiteMuted, fontSize: 14)),
        const SizedBox(height: 28),
        TextFormField(
          controller: _refCtrl,
          style: const TextStyle(color: TColors.white),
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Booking Reference',
            hintText: 'TRQ-XXXXXXXX or XXXXXXXX',
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null) _ErrorBox(_error!),
        const SizedBox(height: 8),
        TraqqButton(label: 'Find Booking', isLoading: _loading, onPressed: _lookup),
      ],
    );
  }

  Widget _buildVerify() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Verify your identity',
            style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(
          'We found booking $_displayRef.\nEnter the phone number used to make this booking.',
          style: const TextStyle(color: TColors.whiteMuted, fontSize: 14, height: 1.6),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: TColors.bgCard,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: TColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.phone_rounded, color: TColors.gold, size: 16),
              const SizedBox(width: 8),
              Text('Number on file: ****$_phoneMasked',
                  style: const TextStyle(color: TColors.whiteMuted, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: TColors.white),
          decoration: const InputDecoration(
            labelText: 'Your phone number',
            hintText: '+1 (555) 000-0000',
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null) _ErrorBox(_error!),
        const SizedBox(height: 8),
        TraqqButton(label: 'Verify', isLoading: _loading, onPressed: _verify),
      ],
    );
  }

  Widget _buildEdit() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Make changes',
              style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Editing $_displayRef',
              style: const TextStyle(color: TColors.gold, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 24),

          _FieldLabel('Pickup Date (YYYY-MM-DD)'),
          TextFormField(
            controller: _dateCtrl,
            keyboardType: TextInputType.datetime,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(hintText: '2025-01-15'),
          ),
          const SizedBox(height: 16),

          _FieldLabel('Pickup Time (HH:MM)'),
          TextFormField(
            controller: _timeCtrl,
            keyboardType: TextInputType.datetime,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(hintText: '08:00'),
          ),
          const SizedBox(height: 16),

          _FieldLabel('Pickup Address'),
          TextFormField(
            controller: _addressCtrl,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(hintText: '123 Main St, Dallas, TX'),
          ),
          const SizedBox(height: 16),

          _FieldLabel('Airline (optional)'),
          TextFormField(
            controller: _airlineCtrl,
            style: const TextStyle(color: TColors.white),
            decoration: const InputDecoration(hintText: 'American Airlines'),
          ),
          const SizedBox(height: 24),

          if (_error != null) _ErrorBox(_error!),
          const SizedBox(height: 8),

          TraqqButton(label: 'Save Changes', isLoading: _loading, onPressed: _save),
          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildSuccess() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle_rounded, color: TColors.success, size: 72),
          const SizedBox(height: 20),
          const Text('Changes Saved',
              style: TextStyle(color: TColors.white, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Booking $_displayRef has been updated.',
              style: const TextStyle(color: TColors.whiteMuted, fontSize: 14),
              textAlign: TextAlign.center),
          const SizedBox(height: 32),
          TraqqButton(
            label: 'Back to Home',
            onPressed: () => context.go('/home'),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: const TextStyle(color: TColors.whiteMuted, fontSize: 12)),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;
  const _ErrorBox(this.message);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: TColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: TColors.error.withOpacity(0.3)),
      ),
      child: Text(message, style: const TextStyle(color: TColors.error, fontSize: 13)),
    );
  }
}
