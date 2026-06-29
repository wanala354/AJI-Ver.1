package com.example.ajiportal.utils

import android.content.Context
import android.widget.Toast
import com.example.ajiportal.data.DataRepository
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

object ScannerHelper {
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
                        if (rawValue.startsWith("AJI_PRESENSI:")) {
                            val parts = rawValue.split(":")
                            if (parts.size >= 3) {
                                val tingkat = parts[1].trim()
                                val jenis = parts[2].trim()
                                
                                val jamaah = repository.getMyProfile()
                                if (jamaah == null) {
                                    Toast.makeText(context, "Data jamaah tidak ditemukan.", Toast.LENGTH_SHORT).show()
                                    return@launch
                                }
                                
                                val todayStr = DateUtils.getTodayString()
                                val schedules = repository.getSchedules()
                                val scanTingkatClean = tingkat.lowercase().replace("tingkat", "").replace(" ", "").trim()
                                val scanJenisClean = jenis.lowercase().replace(" ", "").trim()
                                
                                android.util.Log.d("AJI_SCAN", "Scanned raw: $rawValue | todayStr: $todayStr | scanTingkatClean: $scanTingkatClean | scanJenisClean: $scanJenisClean")
                                schedules.forEach { s ->
                                    val sTingkatClean = (s.tingkatPengajian ?: "").lowercase().replace("tingkat", "").replace(" ", "").trim()
                                    val sJenisClean = (s.jenisPengajian ?: "").lowercase().replace(" ", "").trim()
                                    android.util.Log.d("AJI_SCAN", "DB Schedule ID ${s.id}: tanggal=${s.tanggal}, tingkat=$sTingkatClean, jenis=$sJenisClean")
                                }
                                
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
                                            val ok = repository.selfCheckIn(match.id, "Hadir Fisik", "Scan QR Dinding")
                                            if (ok) {
                                                Toast.makeText(context, "Presensi Hadir Fisik ($jenis) berhasil dikirim!", Toast.LENGTH_LONG).show()
                                                onSuccess()
                                            } else {
                                                Toast.makeText(context, "Gagal mengirim presensi. Periksa koneksi internet.", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    }
                                } else {
                                    val kelompokText = if (scanTingkatClean == "kelompok") " Kelompok ${jamaah.kelompokPengajian}" else ""
                                    Toast.makeText(context, "Tidak ada jadwal aktif pengajian $tingkat$kelompokText - $jenis hari ini.", Toast.LENGTH_LONG).show()
                                }
                            } else {
                                Toast.makeText(context, "Format QR Code Dinding salah.", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            val sessionId = rawValue.toIntOrNull()
                            if (sessionId != null) {
                                val ok = repository.selfCheckIn(sessionId, "Hadir Fisik", "Scan Barcode")
                                if (ok) {
                                    Toast.makeText(context, "Presensi Hadir Fisik berhasil dikirim!", Toast.LENGTH_LONG).show()
                                    onSuccess()
                                } else {
                                    Toast.makeText(context, "Gagal mengirim presensi. Periksa koneksi internet.", Toast.LENGTH_LONG).show()
                                }
                            } else {
                                Toast.makeText(context, "Format QR Code salah (harus angka ID Sesi atau QR Dinding)", Toast.LENGTH_LONG).show()
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
