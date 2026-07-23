class AppConfig {
  AppConfig._();

  static const String baseUrl = 'https://mytraqq.com/api';

  // Stripe publishable key â€” also fetched dynamically from /api/config
  // Set here as a fallback for build-time configuration
  static const String stripePublishableKey =
      'pk_live_51THo6r0nWwiRzxXQFMzTBnckwbAqwTj1oQuzJfzpeGAOEpFzEEy0vj5mKAM6hHikjN0UG9gyEqelygQlfhBdY1tC00BLugeOCY';

  // FCM topic for driver notifications (subscribe on driver login)
  static const String driverFcmTopic = 'drivers';

  // Location update interval for drivers (seconds)
  static const int locationUpdateIntervalSeconds = 30;

  // Request timeout
  static const int connectTimeoutMs = 15000;
  static const int receiveTimeoutMs = 30000;
}
