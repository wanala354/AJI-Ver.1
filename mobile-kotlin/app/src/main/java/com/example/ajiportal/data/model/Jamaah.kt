package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Jamaah(
    val id: String,
    @SerialName("nama_lengkap") val namaLengkap: String,
    @SerialName("kelompok_pengajian") val kelompokPengajian: String,
    @SerialName("jenis_kelamin") val jenisKelamin: String,
    @SerialName("tempat_lahir") val tempatLahir: String? = null,
    @SerialName("tanggal_lahir") val tanggalLahir: String? = null,
    @SerialName("status_pernikahan") val statusPernikahan: String? = null,
    @SerialName("status_hubungan_keluarga") val statusHubunganKeluarga: String? = null,
    @SerialName("kepala_keluarga_id") val kepalaKeluargaId: String? = null,
    @SerialName("nomor_hp") val nomorHp: String? = null,
    @SerialName("tingkat_pendidikan") val tingkatPendidikan: String? = null,
    @SerialName("pekerjaan_utama") val pekerjaanUtama: String? = null,
    val dapuan: String? = null,
    @SerialName("status_ekonomi") val statusEkonomi: String? = null,
    @SerialName("kelancaran_sambung") val kelancaranSambung: String? = null,
    @SerialName("foto_url") val fotoUrl: String? = null
)
