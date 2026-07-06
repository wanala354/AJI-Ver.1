package com.example.ajiportal.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.example.ajiportal.data.SupabaseApi
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

object UpdateChecker {
    private const val UPDATE_JSON_URL = "https://mphxkqcvcmdqafrslwti.supabase.co/storage/v1/object/public/apk/version.json"

    suspend fun checkForUpdates(context: Context) {
        withContext(Dispatchers.IO) {
            try {
                val api = SupabaseApi()
                val response: HttpResponse = api.client.get(UPDATE_JSON_URL)
                if (response.status.value == 200) {
                    val jsonStr = response.bodyAsText()
                    val json = Json.parseToJsonElement(jsonStr).jsonObject
                    
                    val serverVersionCode = json["versionCode"]?.jsonPrimitive?.longOrNull ?: 0L
                    val serverVersionName = json["versionName"]?.jsonPrimitive?.content ?: "1.0"
                    val apkUrl = json["apkUrl"]?.jsonPrimitive?.content ?: ""
                    val changelog = json["changelog"]?.jsonPrimitive?.content ?: "Pembaruan sistem."

                    val currentVersionCode = getAppVersionCode(context)

                    if (serverVersionCode > currentVersionCode) {
                        withContext(Dispatchers.Main) {
                            showUpdateDialog(context, serverVersionName, changelog, apkUrl)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun getAppVersionCode(context: Context): Long {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
        } catch (e: Exception) {
            1L
        }
    }

    private fun showUpdateDialog(context: Context, versionName: String, changelog: String, apkUrl: String) {
        android.app.AlertDialog.Builder(context)
            .setTitle("Pembaruan Aplikasi Tersedia (v$versionName)")
            .setMessage("Ada versi baru untuk aplikasi AJI Portal.\n\nYang Baru:\n$changelog\n\nApakah Anda ingin memperbarui sekarang?")
            .setPositiveButton("Update Sekarang") { _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "Gagal membuka browser.", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Nanti", null)
            .setCancelable(true)
            .show()
    }
}
