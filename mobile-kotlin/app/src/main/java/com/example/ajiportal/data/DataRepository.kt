package com.example.ajiportal.data

import android.content.Context
import com.example.ajiportal.data.model.*
import com.example.ajiportal.utils.DateUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate

interface DataRepository {
    val sessionManager: SessionManager
    val api: SupabaseApi
    
    // Auth & Session
    suspend fun login(username: String, passwordHash: String): Boolean
    fun logout()
    
    // Profiles & Family
    suspend fun getMyProfile(): Jamaah?
    suspend fun getFamily(): List<Jamaah>
    
    // Schedules & Check-in
    suspend fun getSchedules(): List<Jadwal>
    suspend fun getMyPresensi(): List<Presensi>
    suspend fun selfCheckIn(idPengajian: Int, status: String, keterangan: String?): Boolean
    
    // Security
    suspend fun updatePassword(newPasswordHash: String): Boolean

    // Master lists & roles
    suspend fun getMasterJenisPengajian(): List<MasterJenisPengajian>
    suspend fun getMyPengurusRoles(): List<Pengurus>
    suspend fun getFamilyPresensi(jamaahId: String): List<Presensi>
    suspend fun getFamilyPengurusRoles(jamaahId: String): List<Pengurus>
    
    suspend fun getNextJamaahId(): String
    suspend fun saveJamaah(jamaah: Jamaah): Boolean
    suspend fun uploadPhoto(fileName: String, base64Data: String): String?
    
    suspend fun getAllJamaah(): List<Jamaah>
    suspend fun getKelompokList(): List<String>
    suspend fun registerLinkedUser(username: String, passwordHash: String, jamaahId: String, kelompok: String): Boolean
    suspend fun registerNewUser(
        username: String,
        passwordHash: String,
        namaLengkap: String,
        kelompok: String,
        jenisKelamin: String,
        tanggalLahir: String?,
        nomorHp: String?,
        statusPernikahan: String?,
        fotoUrl: String?
    ): Boolean
}

class DefaultDataRepository(private val context: Context) : DataRepository {
    override val sessionManager = SessionManager(context)
    override val api = SupabaseApi()

    override suspend fun login(username: String, passwordHash: String): Boolean = withContext(Dispatchers.IO) {
        val user = api.authenticate(username, passwordHash)
        if (user != null && user.status == "active") {
            sessionManager.saveSession(user, passwordHash)
            api.logAction(username, "LOGIN", "Pengguna ${user.username} dengan role ${user.role} (${user.kelompok}) login ke Android App.")
            true
        } else {
            false
        }
    }

    override fun logout() {
        sessionManager.clearSession()
    }

    override suspend fun getMyProfile(): Jamaah? = withContext(Dispatchers.IO) {
        val jamaahId = sessionManager.getJamaahId() ?: return@withContext null
        api.getJamaah(jamaahId)
    }

    override suspend fun getFamily(): List<Jamaah> = withContext(Dispatchers.IO) {
        val profile = getMyProfile() ?: return@withContext emptyList()
        val kkId = if (profile.kepalaKeluargaId.isNullOrEmpty()) profile.id else profile.kepalaKeluargaId
        if (kkId.isEmpty()) {
            listOf(profile)
        } else {
            api.getFamilyMembers(kkId)
        }
    }

    override suspend fun getSchedules(): List<Jadwal> = withContext(Dispatchers.IO) {
        // Fetch schedules starting from 60 days ago
        val sinceDate = LocalDate.now().minusDays(60).toString()
        api.getSchedules(sinceDate)
    }

    override suspend fun getMyPresensi(): List<Presensi> = withContext(Dispatchers.IO) {
        val jamaahId = sessionManager.getJamaahId() ?: return@withContext emptyList()
        api.getPresensiList(jamaahId)
    }

    override suspend fun selfCheckIn(idPengajian: Int, status: String, keterangan: String?): Boolean = withContext(Dispatchers.IO) {
        val jamaahId = sessionManager.getJamaahId() ?: return@withContext false
        val username = sessionManager.getUsername() ?: jamaahId
        api.selfCheckIn(idPengajian, jamaahId, status, keterangan, username)
    }

    override suspend fun updatePassword(newPasswordHash: String): Boolean = withContext(Dispatchers.IO) {
        val username = sessionManager.getUsername() ?: return@withContext false
        val success = api.changePassword(username, newPasswordHash, username)
        if (success) {
            val user = sessionManager.getUser()
            if (user != null) {
                sessionManager.saveSession(user, newPasswordHash)
            }
        }
        success
    }

    override suspend fun getMasterJenisPengajian(): List<MasterJenisPengajian> = withContext(Dispatchers.IO) {
        api.getMasterJenisPengajian()
    }

    override suspend fun getMyPengurusRoles(): List<Pengurus> = withContext(Dispatchers.IO) {
        val jamaahId = sessionManager.getJamaahId() ?: return@withContext emptyList()
        api.getPengurusRoles(jamaahId)
    }

    override suspend fun getFamilyPresensi(jamaahId: String): List<Presensi> = withContext(Dispatchers.IO) {
        api.getPresensiList(jamaahId)
    }

    override suspend fun getFamilyPengurusRoles(jamaahId: String): List<Pengurus> = withContext(Dispatchers.IO) {
        api.getPengurusRoles(jamaahId)
    }

    override suspend fun getNextJamaahId(): String = withContext(Dispatchers.IO) {
        api.getNextJamaahId()
    }

    override suspend fun saveJamaah(jamaah: Jamaah): Boolean = withContext(Dispatchers.IO) {
        val username = sessionManager.getUsername() ?: "unknown"
        api.saveJamaah(jamaah, username)
    }

    override suspend fun uploadPhoto(fileName: String, base64Data: String): String? = withContext(Dispatchers.IO) {
        api.uploadPhoto(fileName, base64Data)
    }

    override suspend fun getAllJamaah(): List<Jamaah> = withContext(Dispatchers.IO) {
        api.getAllJamaah()
    }

    override suspend fun getKelompokList(): List<String> = withContext(Dispatchers.IO) {
        api.getKelompokList()
    }

    override suspend fun registerLinkedUser(username: String, passwordHash: String, jamaahId: String, kelompok: String): Boolean = withContext(Dispatchers.IO) {
        api.registerLinkedUser(username, passwordHash, jamaahId, kelompok)
    }

    override suspend fun registerNewUser(
        username: String,
        passwordHash: String,
        namaLengkap: String,
        kelompok: String,
        jenisKelamin: String,
        tanggalLahir: String?,
        nomorHp: String?,
        statusPernikahan: String?,
        fotoUrl: String?
    ): Boolean = withContext(Dispatchers.IO) {
        api.registerNewUser(username, passwordHash, namaLengkap, kelompok, jenisKelamin, tanggalLahir, nomorHp, statusPernikahan, fotoUrl)
    }
}
