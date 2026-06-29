package com.example.ajiportal.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuditLog(
    val id: Int? = null,
    @SerialName("operator_username") val operatorUsername: String,
    val action: String,
    val description: String,
    val timestamp: String? = null
)
