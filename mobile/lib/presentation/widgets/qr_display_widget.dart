import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../theme/app_theme.dart';

/// Displays a QR code from either a raw string or a data URL.
/// Backend returns a PNG data URL for the QR image; we extract
/// the underlying booking URL and regenerate a crisp vector QR.
class QrDisplayWidget extends StatelessWidget {
  final String? qrUrl;          // data: URL or raw URL from API
  final String? bookingRef;     // fallback: encode the booking ref
  final double size;

  const QrDisplayWidget({
    super.key,
    this.qrUrl,
    this.bookingRef,
    this.size = 200,
  });

  String _qrData() {
    // If it's a tracking URL (not a data URL), use it directly
    final url = qrUrl ?? '';
    if (url.startsWith('http')) return url;

    // Backend returns a data URL — we can't decode it to a QR value,
    // so encode the tracking URL from the booking ref instead.
    if (bookingRef != null) {
      return 'https://mytraqq.com/track?ref=$bookingRef';
    }
    return 'https://mytraqq.com';
  }

  @override
  Widget build(BuildContext context) {
    final data = _qrData();

    return Container(
      width: size + 32,
      height: size + 32,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(16),
      child: QrImageView(
        data: data,
        version: QrVersions.auto,
        size: size,
        backgroundColor: Colors.white,
        eyeStyle: const QrEyeStyle(
          eyeShape: QrEyeShape.square,
          color: Color(0xFF0A0A0F),
        ),
        dataModuleStyle: const QrDataModuleStyle(
          dataModuleShape: QrDataModuleShape.square,
          color: Color(0xFF0A0A0F),
        ),
      ),
    );
  }
}
