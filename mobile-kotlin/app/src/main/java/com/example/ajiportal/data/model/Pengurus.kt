package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Pengurus(
    val id: Int? = null,
    @SerialName("jamaah_id") val jamaahId: String,
    @SerialName("tingkat_pengurus") val tingkatPengurus: String? = null,
    val dapuan: String? = null
)
