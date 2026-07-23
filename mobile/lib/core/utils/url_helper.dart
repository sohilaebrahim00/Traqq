import 'package:url_launcher/url_launcher.dart';

class UrlHelper {
  UrlHelper._();

  static Future<void> _launch(Uri uri, {bool external = false}) async {
    final mode = external ? LaunchMode.externalApplication : LaunchMode.platformDefault;
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: mode);
  }

  static Future<void> launchEmail(String email) => _launch(Uri(scheme: 'mailto', path: email));
  static Future<void> launchPhone(String phone) => _launch(Uri(scheme: 'tel', path: phone));
  static Future<void> launchWebUrl(String url) => _launch(Uri.parse(url), external: true);
}
