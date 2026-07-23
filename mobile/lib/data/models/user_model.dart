import 'dart:convert';

class UserModel {
  final String id;
  final String fullName;
  final String? email;
  final String? phoneNumber;
  final String role;
  final DriverProfileModel? driverProfile;

  const UserModel({
    required this.id,
    required this.fullName,
    this.email,
    this.phoneNumber,
    required this.role,
    this.driverProfile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        email: json['email'] as String?,
        phoneNumber: json['phoneNumber'] as String?,
        role: json['role'] as String? ?? 'CUSTOMER',
        driverProfile: json['driverProfile'] != null
            ? DriverProfileModel.fromJson(json['driverProfile'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'email': email,
        'phoneNumber': phoneNumber,
        'role': role,
        if (driverProfile != null) 'driverProfile': driverProfile!.toJson(),
      };

  String toJsonString() => jsonEncode(toJson());

  factory UserModel.fromJsonString(String s) =>
      UserModel.fromJson(jsonDecode(s) as Map<String, dynamic>);

  bool get isCustomer => role == 'CUSTOMER';
  bool get isDriver   => role == 'DRIVER';
  bool get isAdmin    => role == 'ADMIN';
}

class DriverProfileModel {
  final String id;
  final String? licenseNumber;
  final String vehicleMake;
  final String vehicleModel;
  final String vehicleColor;
  final String vehiclePlate;
  final String? profilePhoto;
  final bool isAvailable;

  const DriverProfileModel({
    required this.id,
    this.licenseNumber,
    required this.vehicleMake,
    required this.vehicleModel,
    required this.vehicleColor,
    required this.vehiclePlate,
    this.profilePhoto,
    required this.isAvailable,
  });

  factory DriverProfileModel.fromJson(Map<String, dynamic> json) =>
      DriverProfileModel(
        id: json['id'] as String,
        licenseNumber: json['licenseNumber'] as String?,
        vehicleMake: json['vehicleMake'] as String? ?? '',
        vehicleModel: json['vehicleModel'] as String? ?? '',
        vehicleColor: json['vehicleColor'] as String? ?? '',
        vehiclePlate: json['vehiclePlate'] as String? ?? '',
        profilePhoto: json['profilePhoto'] as String?,
        isAvailable: json['isAvailable'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'licenseNumber': licenseNumber,
        'vehicleMake': vehicleMake,
        'vehicleModel': vehicleModel,
        'vehicleColor': vehicleColor,
        'vehiclePlate': vehiclePlate,
        'profilePhoto': profilePhoto,
        'isAvailable': isAvailable,
      };

  String get vehicleDescription => '$vehicleColor $vehicleMake $vehicleModel';
}
