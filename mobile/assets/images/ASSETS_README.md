# Asset Placeholders

Place the following image files here before building:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 px | App icon (no transparency) |
| `icon_foreground.png` | 1024×1024 px | Android adaptive icon foreground |
| `splash_logo.png` | Any | Splash screen centre logo |

## Icon Design Guidelines

- Background: #0A0A0A (TRAQQ black)
- Primary colour: #C9A84C (TRAQQ gold)
- Keep foreground in the central 72% safe zone for adaptive icons
- Export at 1024×1024 PNG

## After adding images

1. **Icons:** uncomment paths in `flutter_launcher_icons.yaml`, then run:
   ```
   dart run flutter_launcher_icons
   ```

2. **Splash:** uncomment image line in `pubspec.yaml` under `flutter_native_splash:`, then run:
   ```
   dart run flutter_native_splash:create
   ```
