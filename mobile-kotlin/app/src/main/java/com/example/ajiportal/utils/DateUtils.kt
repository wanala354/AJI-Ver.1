package com.example.ajiportal.utils

import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object DateUtils {
    private val zoneJakarta = ZoneId.of("Asia/Jakarta")

    fun getTodayString(): String {
        return LocalDate.now(zoneJakarta).toString() // YYYY-MM-DD
    }

    fun getCurrentTimeShort(): String {
        val now = java.time.LocalTime.now(zoneJakarta)
        return String.format(Locale.US, "%02d:%02d", now.hour, now.minute)
    }

    fun formatDateIndo(dateStr: String?): String {
        if (dateStr.isNullOrEmpty()) return "-"
        return try {
            val localDate = LocalDate.parse(dateStr)
            val day = localDate.dayOfMonth
            val monthNames = arrayOf(
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            )
            val month = monthNames[localDate.monthValue - 1]
            val year = localDate.year
            "$day $month $year"
        } catch (e: Exception) {
            dateStr
        }
    }

    fun formatMonthYearIndo(yearMonthStr: String?): String {
        if (yearMonthStr.isNullOrEmpty()) return "-"
        return try {
            val parts = yearMonthStr.split("-")
            if (parts.size >= 2) {
                val year = parts[0]
                val monthVal = parts[1].toInt()
                val monthNames = arrayOf(
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                )
                val monthName = monthNames[monthVal - 1]
                "$monthName $year"
            } else {
                yearMonthStr
            }
        } catch (e: Exception) {
            yearMonthStr
        }
    }

    fun calculateAge(birthDateString: String?): Int {
        if (birthDateString.isNullOrEmpty()) return 0
        return try {
            val birthDate = LocalDate.parse(birthDateString)
            val today = LocalDate.now(zoneJakarta)
            Period.between(birthDate, today).years
        } catch (e: Exception) {
            0
        }
    }

    fun getKelompokPeramutan(age: Int, maritalStatus: String?, tingkatPendidikan: String?): String {
        val edu = tingkatPendidikan?.trim()?.uppercase() ?: ""
        if ((age in 13..18) || edu == "SMP" || edu == "SLTA/SMK") {
            return "GUS"
        }
        if (age <= 3) return "Balita"
        if (age <= 5) return "PAUD"
        if (age <= 12) return "Caberawit"
        if (age >= 60) return "Manula"
        if (age in 30..59) return "Dewasa"
        if (age in 19..29) {
            if (maritalStatus == "Belum Menikah") return "GUM"
            return "Dewasa"
        }
        return "Dewasa"
    }

    fun getCheckInTimeState(waktuMulai: String?, waktuSelesai: String?): CheckInTimeState {
        return try {
            val zoneId = java.time.ZoneId.of("Asia/Jakarta")
            val now = java.time.LocalTime.now(zoneId)
            val start = java.time.LocalTime.parse(waktuMulai ?: "20:00:00")
            val end = java.time.LocalTime.parse(waktuSelesai ?: "21:30:00")
            when {
                now.isBefore(start) -> CheckInTimeState.NOT_OPENED
                now.isAfter(end) -> CheckInTimeState.CLOSED
                else -> CheckInTimeState.OPENED
            }
        } catch (e: Exception) {
            CheckInTimeState.OPENED
        }
    }
}

enum class CheckInTimeState {
    NOT_OPENED,
    OPENED,
    CLOSED
}
