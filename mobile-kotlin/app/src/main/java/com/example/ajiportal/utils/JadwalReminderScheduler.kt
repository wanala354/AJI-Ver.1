package com.example.ajiportal.utils

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.example.ajiportal.data.model.Jadwal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

object JadwalReminderScheduler {
    fun scheduleAlarms(context: Context, schedules: List<Jadwal>) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        
        schedules.forEach { schedule ->
            try {
                val startStr = schedule.waktuMulai ?: return@forEach
                val date = LocalDate.parse(schedule.tanggal)
                val time = parseLocalTime(startStr) ?: return@forEach
                
                val scheduleDateTime = LocalDateTime.of(date, time)
                // Schedule alarm 1 hour before start time
                val alarmDateTime = scheduleDateTime.minusHours(1)
                
                val currentDateTime = LocalDateTime.now()
                if (alarmDateTime.isBefore(currentDateTime)) {
                    if (scheduleDateTime.isAfter(currentDateTime)) {
                        val triggerMillis = scheduleDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                        setAlarm(context, alarmManager, schedule, triggerMillis)
                    }
                } else {
                    val triggerMillis = alarmDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    setAlarm(context, alarmManager, schedule, triggerMillis)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun setAlarm(context: Context, alarmManager: AlarmManager, schedule: Jadwal, triggerMillis: Long) {
        val intent = Intent(context, JadwalReminderReceiver::class.java).apply {
            putExtra("schedule_id", schedule.id)
            putExtra("jenis_pengajian", schedule.jenisPengajian ?: "Pengajian")
            putExtra("waktu_mulai", schedule.waktuMulai ?: "")
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            schedule.id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerMillis,
                        pendingIntent
                    )
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerMillis,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    triggerMillis,
                    pendingIntent
                )
            }
        } catch (e: SecurityException) {
            // Fallback to inexact idle alarm if exact alarm permission is not granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerMillis,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    triggerMillis,
                    pendingIntent
                )
            }
        }
    }

    private fun parseLocalTime(timeStr: String): LocalTime? {
        return try {
            val clean = timeStr.trim()
            val parts = clean.split(":")
            if (parts.size >= 2) {
                val hour = parts[0].toIntOrNull() ?: 0
                val min = parts[1].toIntOrNull() ?: 0
                val sec = if (parts.size >= 3) parts[2].toIntOrNull() ?: 0 else 0
                LocalTime.of(hour, min, sec)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
