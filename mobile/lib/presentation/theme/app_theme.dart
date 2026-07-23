import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class TFonts {
  static TextStyle playfair({double size = 28, FontWeight weight = FontWeight.w700, Color color = TColors.white}) =>
      GoogleFonts.playfairDisplay(fontSize: size, fontWeight: weight, color: color);
}

abstract class TColors {
  static const bg         = Color(0xFF0A0A0A);
  static const bgCard     = Color(0xFF141414);
  static const bgElevated = Color(0xFF1C1C1C);
  static const gold       = Color(0xFFC9A84C);
  static const goldLight  = Color(0xFFD4B96A);
  static const goldDim    = Color(0x33C9A84C);
  static const white      = Color(0xFFFFFFFF);
  static const whiteMuted = Color(0xFFAAAAAA);
  static const whiteFaint = Color(0xFF666666);
  static const border     = Color(0xFF2A2A2A);
  static const error      = Color(0xFFFF5F5F);
  static const success    = Color(0xFF4CAF50);
  static const info       = Color(0xFF64B5F6);
  static const warning    = Color(0xFFFF9F43);
}

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: TColors.bg,
        colorScheme: const ColorScheme.dark(
          primary: TColors.gold,
          onPrimary: TColors.bg,
          secondary: TColors.goldLight,
          surface: TColors.bgCard,
          error: TColors.error,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: TColors.bg,
          foregroundColor: TColors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.light,
          ),
          titleTextStyle: TextStyle(
            color: TColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
          ),
        ),
        cardTheme: const CardThemeData(
          color: TColors.bgCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: TColors.border),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: TColors.bgElevated,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: TColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: TColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: TColors.gold, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: TColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: TColors.error, width: 1.5),
          ),
          hintStyle: const TextStyle(color: TColors.whiteFaint, fontSize: 14),
          labelStyle: const TextStyle(color: TColors.whiteMuted, fontSize: 14),
          errorStyle: const TextStyle(color: TColors.error, fontSize: 12),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: TColors.gold,
            foregroundColor: TColors.bg,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: TColors.gold,
            side: const BorderSide(color: TColors.gold),
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: TColors.gold,
            textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ),
        textTheme: GoogleFonts.interTextTheme(const TextTheme(
          displayLarge: TextStyle(color: TColors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1),
          displayMedium: TextStyle(color: TColors.white, fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.5),
          titleLarge: TextStyle(color: TColors.white, fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3),
          titleMedium: TextStyle(color: TColors.white, fontSize: 16, fontWeight: FontWeight.w600),
          titleSmall: TextStyle(color: TColors.whiteMuted, fontSize: 13, fontWeight: FontWeight.w500, letterSpacing: 0.5),
          bodyLarge: TextStyle(color: TColors.white, fontSize: 15, fontWeight: FontWeight.w400),
          bodyMedium: TextStyle(color: TColors.whiteMuted, fontSize: 14, fontWeight: FontWeight.w400),
          bodySmall: TextStyle(color: TColors.whiteMuted, fontSize: 12),
          labelLarge: TextStyle(color: TColors.white, fontSize: 14, fontWeight: FontWeight.w600),
        )),
        dividerTheme: const DividerThemeData(color: TColors.border, space: 1),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: TColors.bgCard,
          selectedItemColor: TColors.gold,
          unselectedItemColor: TColors.whiteFaint,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
        chipTheme: ChipThemeData(
          backgroundColor: TColors.bgElevated,
          selectedColor: TColors.goldDim,
          side: const BorderSide(color: TColors.border),
          labelStyle: const TextStyle(color: TColors.white, fontSize: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: TColors.bgElevated,
          contentTextStyle: const TextStyle(color: TColors.white),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          behavior: SnackBarBehavior.floating,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: TColors.gold,
        ),
        iconTheme: const IconThemeData(color: TColors.whiteMuted, size: 20),
      );
}
