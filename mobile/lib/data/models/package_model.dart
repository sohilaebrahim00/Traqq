class PackageModel {
  final String id;
  final String planId;
  final int totalRides;
  final int usedRides;
  final double pricePaid;
  final DateTime? expiresAt;
  final bool isActive;

  const PackageModel({
    required this.id,
    required this.planId,
    required this.totalRides,
    required this.usedRides,
    required this.pricePaid,
    this.expiresAt,
    required this.isActive,
  });

  int get remainingRides => totalRides - usedRides;

  factory PackageModel.fromMap(Map<String, dynamic> m) => PackageModel(
    id: m['id']?.toString() ?? '',
    planId: m['planId']?.toString() ?? '',
    totalRides: (m['totalRides'] as num?)?.toInt() ?? 0,
    usedRides: (m['usedRides'] as num?)?.toInt() ?? 0,
    pricePaid: (m['pricePaid'] as num?)?.toDouble() ?? 0,
    expiresAt: m['expiresAt'] != null ? DateTime.tryParse(m['expiresAt'].toString()) : null,
    isActive: m['isActive'] as bool? ?? false,
  );
}
