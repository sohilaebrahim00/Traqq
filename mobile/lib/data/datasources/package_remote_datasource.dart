import '../models/package_model.dart';
import '../../core/network/api_client.dart';

class PackageRemoteDataSource {
  final ApiClient _client;
  PackageRemoteDataSource(this._client);

  Future<List<PackageModel>> getActivePackages() async {
    final resp = await _client.dio.get('/packages/active');
    final data = resp.data;
    if (data is List) {
      return data.map((e) => PackageModel.fromMap(e as Map<String, dynamic>)).toList();
    }
    final list = (data as Map<String, dynamic>)['packages'] as List? ?? [];
    return list.map((e) => PackageModel.fromMap(e as Map<String, dynamic>)).toList();
  }

  Future<void> redeemPackage(String packageId) async {
    await _client.dio.post('/packages/redeem', data: {'packageId': packageId});
  }

  Future<PackageModel> purchasePackage(String planId) async {
    final resp = await _client.dio.post('/packages/purchase', data: {'planId': planId});
    return PackageModel.fromMap(resp.data as Map<String, dynamic>);
  }
}
