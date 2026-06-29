package com.example.ajiportal.utils

import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.data.model.Jadwal
import com.example.ajiportal.data.model.MasterJenisPengajian
import com.example.ajiportal.data.model.Pengurus

object EligibilityHelper {
    fun isJamaahEligible(
        j: Jamaah,
        s: Jadwal,
        masterJenisList: List<MasterJenisPengajian> = emptyList(),
        pengurusRoles: List<Pengurus> = emptyList()
    ): Boolean {
        // 1. Kelompok check
        val tk = (s.tingkatPengajian ?: "").lowercase()
        val isKelompok = tk.contains("kelompok") || (!tk.contains("desa") && !tk.contains("daerah"))
        if (isKelompok && s.kelompokPengajian != j.kelompokPengajian) {
            return false
        }
        
        // 2. Specific attendees check
        val allowedIds = s.pesertaSpesifik?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()
        if (allowedIds.isNotEmpty()) {
            return allowedIds.contains(j.id)
        }
        
        val jenisClean = (s.jenisPengajian ?: "").trim().lowercase().replace("\\s+".toRegex(), "")
        val gender = j.jenisKelamin.trim().lowercase()

        val age = DateUtils.calculateAge(j.tanggalLahir)
        val peramutan = DateUtils.getKelompokPeramutan(age, j.statusPernikahan, j.tingkatPendidikan)

        // 3. Dynamic lookup from master list
        val match = masterJenisList.find { item ->
            item.nama.trim().lowercase().replace("\\s+".toRegex(), "") == jenisClean
        }

        if (match != null) {
            // Gender restriction
            val genderLimit = (match.batasanGender ?: "Semua").trim().lowercase()
            if (genderLimit == "laki-laki" && gender != "laki-laki") {
                return false
            }
            if (genderLimit == "perempuan" && gender != "perempuan") {
                return false
            }

            // Dapuan restriction
            val targetDapuanStr = (match.targetDapuan ?: "").trim()
            if (targetDapuanStr.isNotEmpty()) {
                val allowedDapuans = targetDapuanStr.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
                if (allowedDapuans.isNotEmpty()) {
                    val jamaahDapuans = mutableListOf<String>()
                    j.dapuan?.let { jamaahDapuans.add(it.trim().lowercase()) }
                    pengurusRoles.forEach { p ->
                        p.dapuan?.let { jamaahDapuans.add(it.trim().lowercase()) }
                    }
                    val hasMatchingDapuan = allowedDapuans.any { ad -> jamaahDapuans.contains(ad) }
                    if (!hasMatchingDapuan) {
                        return false
                    }
                }
            }

            // Demographic/Peramutan restriction
            val participantsStr = (match.pesertaPengajian ?: "").trim()
            if (participantsStr.isNotEmpty()) {
                val allowedPeramutan = participantsStr.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
                if (allowedPeramutan.isNotEmpty()) {
                    val currentPeramutanLower = peramutan.trim().lowercase()
                    val hasMatchingPeramutan = allowedPeramutan.any { ap -> ap == currentPeramutanLower }
                    if (!hasMatchingPeramutan) {
                        return false
                    }
                }
            }
        } else {
            // 4. Fallbacks (exactly as in web app)
            val isFemaleOnly = jenisClean.contains("ibu") || jenisClean.contains("wanita") || jenisClean.contains("kewanitaan") || jenisClean.contains("akhwat")
            val isMaleOnly = jenisClean.contains("bapak") || jenisClean.contains("pria") || jenisClean.contains("ikhwan")
            
            if (isFemaleOnly && gender != "perempuan") return false
            if (isMaleOnly && gender != "laki-laki") return false
            
            val peramutanLower = peramutan.lowercase()
            if (jenisClean.contains("caberawit") && peramutanLower != "caberawit" && peramutanLower != "balita" && peramutanLower != "paud") return false
            if (jenisClean.contains("gus") && peramutanLower != "gus") return false
            if (jenisClean.contains("gum") && peramutanLower != "gum") return false
        }
        
        return true
    }
}
