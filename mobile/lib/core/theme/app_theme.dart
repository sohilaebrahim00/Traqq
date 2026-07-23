import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color black = Color(0xFF0A0A0A);
  static const Color offBlack = Color(0xFF111111);
  static const Color surface = Color(0xFF161616);
  static const Color border = Color(0xFF2A2A2A);
  static const Color white = Color(0xFFF5F5F5);
  static const Color whiteMuted = Color(0xFFA0A0A0);
  static const Color gold = Color(0xFFC9A84C);
  static const Color goldLight = Color(0xFFE0BF78);
  static const Color error = Color(0xFFFF5F5F);
  static const Color success = Color(0xFF4CAF50);
}

class AppTheme {
  AppTheme._();

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.gold,
        secondary: AppColors.goldLight,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: AppColors.black,
        onSecondary: AppColors.black,
        onSurface: AppColors.white,
        onError: AppColors.white,
        outline: AppColors.border,
      ),
      scaffoldBackgroundColor: AppColors.black,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.black,
        foregroundColor: AppColors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: AppColors.white,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
        iconTheme: IconThemeData(color: AppColors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.black,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
      ),
      cardTheme: const CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        thickness: 1,
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: AppColors.surface,
        contentTextStyle: TextStyle(color: AppColors.white),
        behavior: SnackBarBehavior.floating,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        textColor: AppColors.white,
        iconColor: AppColors.gold,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: AppColors.white, fontWeight: FontWeight.w800),
        displayMedium: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700),
        headlineLarge: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700),
        headlineMedium: TextStyle(color: AppColors.white, fontWeight: FontWeight.w600),
        headlineSmall: TextStyle(color: AppColors.white, fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: AppColors.white, fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: AppColors.white, fontWeight: FontWeight.w500),
        bodyLarge: TextStyle(color: AppColors.white),
        bodyMedium: TextStyle(color: AppColors.whiteMuted),
        bodySmall: TextStyle(color: AppColors.whiteMuted),
        labelLarge: TextStyle(color: AppColors.white, fontWeight: FontWeight.w600),
      ),
    );
  }
}
