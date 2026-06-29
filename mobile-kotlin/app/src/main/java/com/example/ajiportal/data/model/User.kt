package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val username: String,
    @SerialName("password_hash") val passwordHash: String? = null,
    val email: String? = null,
    val role: String,
    val kelompok: String,
    @SerialName("jamaah_id") val jamaahId: String? = null,
    val status: String = "active"
)
