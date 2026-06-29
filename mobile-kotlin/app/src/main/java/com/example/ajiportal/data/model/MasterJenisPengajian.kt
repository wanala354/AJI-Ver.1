package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MasterJenisPengajian(
    val nama: String,
    @SerialName("peserta_pengajian") val pesertaPengajian: String? = null,
    @SerialName("batasan_gender") val batasanGender: String? = null,
    @SerialName("target_dapuan") val targetDapuan: String? = null
)
