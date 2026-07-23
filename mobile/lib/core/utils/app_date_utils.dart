import 'package:intl/intl.dart';

class AppDateUtils {
  AppDateUtils._();

  static final _dateFmt      = DateFormat('EEEE, MMM d, yyyy');
  static final _shortDateFmt = DateFormat('MMM d, yyyy');
  static final _timeFmt12    = DateFormat('h:mm a');
  static final _isoDateFmt   = DateFormat('yyyy-MM-dd');

  static String formatDate(DateTime d) => _dateFmt.format(d);
  static String formatShortDate(DateTime d) => _shortDateFmt.format(d);
  static String formatIsoDate(DateTime d) => _isoDateFmt.format(d);

  /// Formats "14:30" → "2:30 PM"
  static String formatPickupTime(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    final h = int.tryParse(parts[0]) ?? 0;
    final m = int.tryParse(parts[1]) ?? 0;
    final dt = DateTime(2000, 1, 1, h, m);
    return _timeFmt12.format(dt);
  }

  /// Parses "2026-06-25T00:00:00.000Z" to DateTime, returning UTC date
  static DateTime parsePickupDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return DateTime.now();
    return dt.toLocal();
  }

  static bool isAtLeast24hFromNow(DateTime date, String time) {
    final parts = time.split(':');
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;
    final pickupMs = DateTime(date.year, date.month, date.day, h, m)
        .millisecondsSinceEpoch;
    return pickupMs - DateTime.now().millisecondsSinceEpoch >= 86400000;
  }

  static DateTime get tomorrow {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day + 1);
  }

  static List<String> generateTimeSlots() {
    final slots = <String>[];
    for (int h = 0; h < 24; h++) {
      slots.add('${h.toString().padLeft(2, '0')}:00');
      slots.add('${h.toString().padLeft(2, '0')}:30');
    }
    return slots;
  }
}
