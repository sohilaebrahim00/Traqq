import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Handles FCM push notifications for TRAQQ.
///
/// Backend sends FCM when:
///   - Driver status changes to DRIVER_ON_THE_WAY or DRIVER_ARRIVED
///   - (Requires backend FCM integration — see backend enhancement notes)
///
/// Current backend notifies via email only. This service is ready for when
/// the backend adds FCM. Wire fcmToken to backend via user profile update.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] Background message: ${message.messageId}');
}

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initialize({
    required void Function(Map<String, dynamic> data) onMessage,
  }) async {
    // Web push requires a firebase-messaging-sw.js service worker and a
    // VAPID key that aren't part of this demo's Firebase setup — skip
    // rather than fail noisily in the browser preview.
    if (kIsWeb) return;

    // Request permission
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Foreground: ${message.notification?.title}');
      onMessage(message.data);
    });

    // App opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] Opened app from notification');
      onMessage(message.data);
    });

    // Handle initial message (app was terminated)
    final initial = await _messaging.getInitialMessage();
    if (initial != null) {
      onMessage(initial.data);
    }
  }

  Future<String?> get fcmToken => kIsWeb ? Future.value(null) : _messaging.getToken();

  // Topic subscriptions aren't implemented for web by firebase_messaging.
  Future<void> subscribeToDriverTopic() =>
      kIsWeb ? Future.value() : _messaging.subscribeToTopic('drivers');

  Future<void> unsubscribeFromDriverTopic() =>
      kIsWeb ? Future.value() : _messaging.unsubscribeFromTopic('drivers');

  Future<void> subscribeToBooking(String bookingId) =>
      kIsWeb ? Future.value() : _messaging.subscribeToTopic('booking_$bookingId');

  Future<void> unsubscribeFromBooking(String bookingId) =>
      kIsWeb ? Future.value() : _messaging.unsubscribeFromTopic('booking_$bookingId');
}
