package com.example.ajiportal.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.ajiportal.MainActivity

class JadwalReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val scheduleId = intent.getIntExtra("schedule_id", 0)
        val jenisPengajian = intent.getStringExtra("jenis_pengajian") ?: "Pengajian"
        val waktuMulai = intent.getStringExtra("waktu_mulai") ?: ""
        
        showNotification(context, scheduleId, jenisPengajian, waktuMulai)
    }

    private fun showNotification(context: Context, scheduleId: Int, jenisPengajian: String, waktuMulai: String) {
        val channelId = "aji_jadwal_reminder_channel"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create channel for API 26+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Pengingat Pengajian AJI"
            val descriptionText = "Notifikasi pengingat sesi pengajian yang akan datang"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(channelId, name, importance).apply {
                description = descriptionText
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Action when notification clicked - open MainActivity
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            scheduleId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Use system default alert icon
        val notificationIcon = android.R.drawable.ic_dialog_info

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(notificationIcon)
            .setContentTitle("Pengingat Pengajian AJI")
            .setContentText("Ada pengajian $jenisPengajian hari ini pukul $waktuMulai. Jangan lupa hadir!")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(scheduleId, notification)
    }
}
