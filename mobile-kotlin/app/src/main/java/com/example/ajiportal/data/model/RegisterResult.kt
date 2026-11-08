package com.example.ajiportal.data.model

sealed class RegisterResult {
    object Success : RegisterResult()
    object UsernameTaken : RegisterResult()
    data class JamaahAlreadyRegistered(val username: String, val status: String) : RegisterResult()
    data class Error(val message: String) : RegisterResult()
}

