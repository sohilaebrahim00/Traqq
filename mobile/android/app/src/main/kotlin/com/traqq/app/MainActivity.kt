package com.traqq.app

import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "com.traqq.app/runtime_diagnostics"
        ).setMethodCallHandler { call, result ->
            if (call.method == "getInfo") {
                result.success(
                    mapOf(
                        "javaClassName" to javaClass.name,
                        "superclassName" to (javaClass.superclass?.name ?: "null"),
                        "isFragmentActivity" to (this is androidx.fragment.app.FragmentActivity),
                        "isFlutterFragmentActivity" to (this is FlutterFragmentActivity)
                    )
                )
            } else {
                result.notImplemented()
            }
        }
    }
}
