package com.example.ajiportal.utils

import android.content.Context
import android.widget.Toast
import com.example.ajiportal.data.DataRepository
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

object ScannerHelper {
    private fun showConfirmationDialog(
        context: Context,
        schedule: com.example.ajiportal.data.model.Jadwal,
        repository: DataRepository,
        coroutineScope: CoroutineScope,
        onSuccess: () -> Unit
    ) {
        val jenis = schedule.jenisPengajian ?: "Pengajian"
        val tingkat = schedule.tingkatPengajian ?: "Umum"
        android.app.AlertDialog.Builder(context)
            .setTitle("Konfirmasi Presensi")
            .setMessage("Isi Presensi pada Kegiatan $jenis ($tingkat)?")
            .setPositiveButton("Ya") { _, _ ->
                coroutineScope.launch {
                    val myPresensi = repository.getMyPresensi()
                    val alreadyCheckedIn = myPresensi.any { it.idPengajian == schedule.id }
                    if (alreadyCheckedIn) {
                        withContext(Dispatchers.Main) {
                            android.app.AlertDialog.Builder(context)
                                .setTitle("Sudah Presensi")
                                .setMessage("Mohon Maaf, Anda sudah Mengisi Presensi")
                                .setPositiveButton("OK", null)
                                .show()
                        }
                        return@launch
                    }
                    val ok = repository.selfCheckIn(schedule.id, "Hadir Fisik", "Scan Barcode")
                    withContext(Dispatchers.Main) {
                        if (ok) {
                            android.app.AlertDialog.Builder(context)
                                .setTitle("Presensi Berhasil")
                                .setMessage("Alhamdulillah Jazakumullahu khoiro, Anda sudah mengisi Presensi")
                                .setPositiveButton("OK", null)
                                .setCancelable(false)
                                .show()
                            onSuccess()
                        } else {
                            Toast.makeText(context, "Gagal mengirim presensi. Periksa koneksi internet.", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun showSelectionDialog(
        context: Context,
        schedules: List<com.example.ajiportal.data.model.Jadwal>,
        repository: DataRepository,
        coroutineScope: CoroutineScope,
        onSuccess: () -> Unit
    ) {
        val names = schedules.map { s ->
            val jenis = s.jenisPengajian ?: "Pengajian"
            val tingkat = s.tingkatPengajian ?: "Umum"
            "$jenis ($tingkat)"
        }.toTypedArray()

        android.app.AlertDialog.Builder(context)
            .setTitle("Pilih Pengajian")
            .setItems(names) { _, which ->
                val selectedSchedule = schedules[which]
                showConfirmationDialog(context, selectedSchedule, repository, coroutineScope, onSuccess)
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    fun startQRScanner(
        context: Context,
        repository: DataRepository,
        coroutineScope: CoroutineScope,
        onSuccess: () -> Unit
    ) {
        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .enableAutoZoom()
            .build()

        val scanner = GmsBarcodeScanning.getClient(context, options)

        scanner.startScan()
            .addOnSuccessListener { barcode ->
                val rawValue = (barcode.rawValue ?: "").trim()
                if (rawValue.isNotEmpty()) {
                    coroutineScope.launch {
                        val jamaah = repository.getMyProfile()
                        if (jamaah == null) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(context, "Data jamaah tidak ditemukan.", Toast.LENGTH_SHORT).show()
                            }
                            return@launch
                        }

                        val todayStr = DateUtils.getTodayString()

                        if (rawValue == "AJI_PRESENSI_UMUM" || rawValue == "AJI_PRESENSI:UMUM:UMUM") {
                            val schedules = repository.getSchedules()
                            val masterJenisList = repository.getMasterJenisPengajian()
                            val pengurusRoles = repository.getMyPengurusRoles()

                            val eligibleToday = schedules.filter { s ->
                                s.tanggal == todayStr && EligibilityHelper.isJamaahEligible(jamaah, s, masterJenisList, pengurusRoles)
                            }

                            val activeSchedules = eligibleToday.filter { s ->
                                DateUtils.getCheckInTimeState(s.waktuMulai, s.waktuSelesai) == CheckInTimeState.OPENED
                            }

                            withContext(Dispatchers.Main) {
                                if (activeSchedules.isEmpty()) {
                                    Toast.makeText(context, "Tidak ada jadwal pengajian aktif untuk Anda saat ini.", Toast.LENGTH_LONG).show()
                                } else if (activeSchedules.size == 1) {
                                    showConfirmationDialog(context, activeSchedules[0], repository, coroutineScope, onSuccess)
                                } else {
                                    showSelectionDialog(context, activeSchedules, repository, coroutineScope, onSuccess)
                                }
                            }
                        } else if (rawValue.startsWith("AJI_PRESENSI:")) {
                            val parts = rawValue.split(":")
                            if (parts.size >= 3) {
                                val tingkat = parts[1].trim()
                                val jenis = parts[2].trim()

                                val schedules = repository.getSchedules()
                                val scanTingkatClean = tingkat.lowercase().replace("tingkat", "").replace(" ", "").trim()
                                val scanJenisClean = jenis.lowercase().replace(" ", "").trim()

                                val match = schedules.find { s ->
                                    val isToday = s.tanggal == todayStr

                                    val dbTingkatClean = (s.tingkatPengajian ?: "").lowercase().replace("tingkat", "").replace(" ", "").trim()
                                    val isTingkatMatch = dbTingkatClean == scanTingkatClean || dbTingkatClean.contains(scanTingkatClean) || scanTingkatClean.contains(dbTingkatClean)

                                    val dbJenisClean = (s.jenisPengajian ?: "").lowercase().replace(" ", "").trim()
                                    val isJenisMatch = dbJenisClean == scanJenisClean || dbJenisClean.contains(scanJenisClean) || scanJenisClean.contains(dbJenisClean)

                                    val isKelompokValid = if (scanTingkatClean == "kelompok") {
                                        s.kelompokPengajian.equals(jamaah.kelompokPengajian, ignoreCase = true)
                                    } else {
                                        true
                                    }

                                    isToday && isTingkatMatch && isJenisMatch && isKelompokValid
                                }

                                withContext(Dispatchers.Main) {
                                    if (match != null) {
                                        val timeState = DateUtils.getCheckInTimeState(match.waktuMulai, match.waktuSelesai)
                                        when (timeState) {
                                            CheckInTimeState.NOT_OPENED -> {
                                                Toast.makeText(context, "Absensi belum dibuka untuk pengajian $jenis.", Toast.LENGTH_LONG).show()
                                            }
                                            CheckInTimeState.CLOSED -> {
                                                Toast.makeText(context, "Absensi sudah ditutup untuk pengajian $jenis.", Toast.LENGTH_LONG).show()
                                            }
                                            CheckInTimeState.OPENED -> {
                                                showConfirmationDialog(context, match, repository, coroutineScope, onSuccess)
                                            }
                                        }
                                    } else {
                                        val kelompokText = if (scanTingkatClean == "kelompok") " Kelompok ${jamaah.kelompokPengajian}" else ""
                                        Toast.makeText(context, "Tidak ada jadwal aktif pengajian $tingkat$kelompokText - $jenis hari ini.", Toast.LENGTH_LONG).show()
                                    }
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    Toast.makeText(context, "Format QR Code Dinding salah.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        } else {
                            val sessionId = rawValue.toIntOrNull()
                            if (sessionId != null) {
                                val schedules = repository.getSchedules()
                                val match = schedules.find { it.id == sessionId }
                                withContext(Dispatchers.Main) {
                                    if (match != null) {
                                        showConfirmationDialog(context, match, repository, coroutineScope, onSuccess)
                                    } else {
                                        // Fallback if schedule is not preloaded in memory
                                        android.app.AlertDialog.Builder(context)
                                            .setTitle("Konfirmasi Presensi")
                                            .setMessage("Isi Presensi pada Kegiatan dengan ID $sessionId?")
                                            .setPositiveButton("Ya") { _, _ ->
                                                coroutineScope.launch {
                                                    val myPresensi = repository.getMyPresensi()
                                                    val alreadyCheckedIn = myPresensi.any { it.idPengajian == sessionId }
                                                    if (alreadyCheckedIn) {
                                                        withContext(Dispatchers.Main) {
                                                            android.app.AlertDialog.Builder(context)
                                                                .setTitle("Sudah Presensi")
                                                                .setMessage("Mohon Maaf, Anda sudah Mengisi Presensi")
                                                                .setPositiveButton("OK", null)
                                                                .show()
                                                        }
                                                        return@launch
                                                    }
                                                    val ok = repository.selfCheckIn(sessionId, "Hadir Fisik", "Scan Barcode")
                                                    withContext(Dispatchers.Main) {
                                                        if (ok) {
                                                            android.app.AlertDialog.Builder(context)
                                                                .setTitle("Presensi Berhasil")
                                                                .setMessage("Alhamdulillah Jazakumullahu khoiro, Anda sudah mengisi Presensi")
                                                                .setPositiveButton("OK", null)
                                                                .setCancelable(false)
                                                                .show()
                                                            onSuccess()
                                                        } else {
                                                            Toast.makeText(context, "Gagal mengirim presensi.", Toast.LENGTH_LONG).show()
                                                        }
                                                    }
                                                }
                                            }
                                            .setNegativeButton("Batal", null)
                                            .show()
                                    }
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    Toast.makeText(context, "Format QR Code salah (harus angka ID Sesi atau QR Dinding)", Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    }
                }
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Batal / Gagal memindai: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }
}
