package com.example.ajiportal.data

import android.content.Context
import com.example.ajiportal.data.model.User

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("aji_portal_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_USERNAME = "username"
        private const val KEY_ROLE = "role"
        private const val KEY_KELOMPOK = "kelompok"
        private const val KEY_JAMAAH_ID = "jamaah_id"
        private const val KEY_STATUS = "status"
        private const val KEY_BIOMETRICS_ENABLED = "biometrics_enabled"
        private const val KEY_PASSWORD_HASH = "password_hash"
    }

    fun saveSession(user: User, passwordHash: String) {
        prefs.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, true)
            putString(KEY_USERNAME, user.username)
            putString(KEY_ROLE, user.role)
            putString(KEY_KELOMPOK, user.kelompok)
            putString(KEY_JAMAAH_ID, user.jamaahId)
            putString(KEY_STATUS, user.status)
            putString(KEY_PASSWORD_HASH, passwordHash)
            apply()
        }
    }

    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

    fun getUsername(): String? = prefs.getString(KEY_USERNAME, null)
    fun getRole(): String? = prefs.getString(KEY_ROLE, null)
    fun getKelompok(): String? = prefs.getString(KEY_KELOMPOK, null)
    fun getJamaahId(): String? = prefs.getString(KEY_JAMAAH_ID, null)
    fun getStatus(): String? = prefs.getString(KEY_STATUS, null)
    fun getPasswordHash(): String? = prefs.getString(KEY_PASSWORD_HASH, null)

    fun isBiometricsEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRICS_ENABLED, false)
    fun setBiometricsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRICS_ENABLED, enabled).apply()
    }

    fun getUser(): User? {
        val username = getUsername() ?: return null
        return User(
            username = username,
            role = getRole() ?: "",
            kelompok = getKelompok() ?: "",
            jamaahId = getJamaahId(),
            status = getStatus() ?: "active"
        )
    }

    fun clearSession() {
        prefs.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, false)
            putString(KEY_USERNAME, null)
            putString(KEY_ROLE, null)
            putString(KEY_KELOMPOK, null)
            putString(KEY_JAMAAH_ID, null)
            putString(KEY_STATUS, null)
            putString(KEY_PASSWORD_HASH, null)
            apply()
        }
    }
}
