package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Presensi(
    val id: Int? = null,
    @SerialName("id_pengajian") val idPengajian: Int,
    @SerialName("id_jamaah") val idJamaah: String,
    val status: String,
    @SerialName("waktu_presensi") val waktuPresensi: String? = null,
    val keterangan: String? = null
)
