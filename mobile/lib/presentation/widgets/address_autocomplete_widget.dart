import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/providers.dart';
import '../theme/app_theme.dart';

class _PlacePrediction {
  final String placeId;
  final String mainText;
  final String secondaryText;

  const _PlacePrediction({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
  });
}

class AddressAutocompleteWidget extends ConsumerStatefulWidget {
  final String? initialValue;
  final void Function(
      String address, double? lat, double? lng, String placeId) onSelected;

  const AddressAutocompleteWidget({
    super.key,
    this.initialValue,
    required this.onSelected,
  });

  @override
  ConsumerState<AddressAutocompleteWidget> createState() =>
      _AddressAutocompleteWidgetState();
}

class _AddressAutocompleteWidgetState
    extends ConsumerState<AddressAutocompleteWidget> {
  late TextEditingController _ctrl;
  final FocusNode _focus = FocusNode();
  List<_PlacePrediction> _suggestions = [];
  bool _loading = false;
  String? _apiKey;
  CancelToken? _cancelToken;
  Timer? _debounce;

  // Separate Dio instance for direct Google API calls (not through our backend)
  final Dio _googleDio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue ?? '');
    _loadApiKey();
  }

  Future<void> _loadApiKey() async {
    try {
      final cfg = await ref.read(configProvider.future);
      if (mounted) setState(() => _apiKey = cfg.googleMapsApiKey);
    } catch (_) {}
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.dispose();
    _focus.dispose();
    _cancelToken?.cancel();
    _googleDio.close();
    super.dispose();
  }

  Future<void> _fetchSuggestions(String input) async {
    if (input.length < 3 || _apiKey == null || _apiKey!.isEmpty) {
      if (mounted) setState(() => _suggestions = []);
      return;
    }

    _cancelToken?.cancel();
    _cancelToken = CancelToken();
    if (mounted) setState(() => _loading = true);

    try {
      final resp = await _googleDio.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        queryParameters: {
          'input': input,
          'key': _apiKey,
          'components': 'country:us',
          'types': 'address',
        },
        cancelToken: _cancelToken,
      );

      final preds = (resp.data['predictions'] as List? ?? [])
          .map((p) => _PlacePrediction(
                placeId: p['place_id'] as String,
                mainText:
                    p['structured_formatting']['main_text'] as String,
                secondaryText:
                    p['structured_formatting']['secondary_text']
                            as String? ??
                        '',
              ))
          .toList();

      if (mounted) setState(() { _suggestions = preds; _loading = false; });
    } on DioException catch (e) {
      if (!CancelToken.isCancel(e) && mounted) {
        setState(() { _suggestions = []; _loading = false; });
      }
    }
  }

  Future<void> _selectPlace(_PlacePrediction p) async {
    final fullAddress =
        '${p.mainText}, ${p.secondaryText}'.trim().replaceAll(RegExp(r',\s*$'), '');
    _ctrl.text = fullAddress;
    if (mounted) setState(() => _suggestions = []);
    _focus.unfocus();

    if (_apiKey == null || _apiKey!.isEmpty) {
      widget.onSelected(fullAddress, null, null, p.placeId);
      return;
    }

    try {
      final resp = await _googleDio.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        queryParameters: {
          'place_id': p.placeId,
          'key': _apiKey,
          'fields': 'geometry,formatted_address',
        },
      );
      final loc = resp.data['result']?['geometry']?['location'];
      widget.onSelected(
        fullAddress,
        (loc?['lat'] as num?)?.toDouble(),
        (loc?['lng'] as num?)?.toDouble(),
        p.placeId,
      );
    } catch (_) {
      widget.onSelected(fullAddress, null, null, p.placeId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: _ctrl,
          focusNode: _focus,
          style: const TextStyle(color: TColors.white),
          decoration: InputDecoration(
            labelText: 'Street address',
            hintText: 'Start typing your address…',
            suffixIcon: _loading
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 1.5)),
                  )
                : _ctrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear,
                            color: TColors.whiteMuted, size: 18),
                        onPressed: () {
                          _ctrl.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
          ),
          onChanged: (val) {
            _debounce?.cancel();
            _debounce = Timer(const Duration(milliseconds: 350),
                () => _fetchSuggestions(val));
          },
        ),

        if (_suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: TColors.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: TColors.border),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _suggestions.length,
              separatorBuilder: (_, __) =>
                  const Divider(color: TColors.border, height: 1),
              itemBuilder: (_, i) {
                final s = _suggestions[i];
                return ListTile(
                  leading: const Icon(Icons.location_on_rounded,
                      color: TColors.whiteMuted, size: 18),
                  title: Text(s.mainText,
                      style: const TextStyle(
                          color: TColors.white, fontSize: 14)),
                  subtitle: s.secondaryText.isNotEmpty
                      ? Text(s.secondaryText,
                          style: const TextStyle(
                              color: TColors.whiteMuted, fontSize: 12))
                      : null,
                  onTap: () => _selectPlace(s),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 4),
                  minVerticalPadding: 0,
                );
              },
            ),
          ),
      ],
    );
  }
}
