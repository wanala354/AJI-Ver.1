package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Jadwal(
    val id: Int,
    @SerialName("tingkat_pengajian") val tingkatPengajian: String? = null,
    @SerialName("jenis_pengajian") val jenisPengajian: String? = null,
    val tanggal: String,
    @SerialName("waktu_mulai") val waktuMulai: String? = null,
    @SerialName("waktu_selesai") val waktuSelesai: String? = null,
    @SerialName("materi_pengajar") val materiPengajar: String? = null, // JSON string
    @SerialName("kelompok_pengajian") val kelompokPengajian: String? = null,
    @SerialName("peserta_spesifik") val pesertaSpesifik: String? = null
)
