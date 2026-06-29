package com.example.ajiportal.data

import com.example.ajiportal.data.model.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.*
import java.time.LocalDate

class SupabaseApi {
    private val supabaseUrl = "https://mphxkqcvcmdqafrslwti.supabase.co"
    private val anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHhrcWN2Y21kcWFmcnNsd3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjQ3NTQsImV4cCI6MjA5NjY0MDc1NH0.o2QXxuhTFwjG1RgAjBSd6JBApjtgdCE6bjTUfnWNET8"

    val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
                encodeDefaults = true
            })
        }
    }

    private fun HttpRequestBuilder.supabaseHeaders() {
        header("apikey", anonKey)
        header("Authorization", "Bearer $anonKey")
    }

    suspend fun authenticate(username: String, passwordHash: String): User? {
        return try {
            val response: List<User> = client.get("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                parameter("username", "eq.$username")
                parameter("password_hash", "eq.$passwordHash")
                parameter("select", "*")
            }.body()
            response.firstOrNull()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun getJamaah(id: String): Jamaah? {
        return try {
            val response: List<Jamaah> = client.get("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                parameter("id", "eq.$id")
                parameter("select", "*")
            }.body()
            response.firstOrNull()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun getFamilyMembers(kkId: String): List<Jamaah> {
        if (kkId.isEmpty()) return emptyList()
        return try {
            client.get("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                parameter("or", "(id.eq.$kkId,kepala_keluarga_id.eq.$kkId)")
                parameter("select", "*")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getSchedules(sinceDate: String): List<Jadwal> {
        return try {
            client.get("$supabaseUrl/rest/v1/pengajian_jadwal") {
                supabaseHeaders()
                parameter("tanggal", "gte.$sinceDate")
                parameter("select", "*")
                parameter("order", "tanggal.desc")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getMasterJenisPengajian(): List<MasterJenisPengajian> {
        return try {
            client.get("$supabaseUrl/rest/v1/master_jenis_pengajian") {
                supabaseHeaders()
                parameter("select", "*")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getPengurusRoles(jamaahId: String): List<Pengurus> {
        return try {
            client.get("$supabaseUrl/rest/v1/pengurus") {
                supabaseHeaders()
                parameter("jamaah_id", "eq.$jamaahId")
                parameter("select", "*")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getPresensiList(jamaahId: String): List<Presensi> {
        return try {
            client.get("$supabaseUrl/rest/v1/pengajian_presensi") {
                supabaseHeaders()
                parameter("id_jamaah", "eq.$jamaahId")
                parameter("select", "*")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun logAction(username: String, action: String, description: String) {
        try {
            val log = AuditLog(
                operatorUsername = username,
                action = action,
                description = description
            )
            client.post("$supabaseUrl/rest/v1/audit_logs") {
                supabaseHeaders()
                contentType(ContentType.Application.Json)
                setBody(log)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun selfCheckIn(idPengajian: Int, jamaahId: String, status: String, keterangan: String?, username: String): Boolean {
        return try {
            if (status == "Alpha" || status.isEmpty()) {
                val res = client.delete("$supabaseUrl/rest/v1/pengajian_presensi") {
                    supabaseHeaders()
                    parameter("id_pengajian", "eq.$idPengajian")
                    parameter("id_jamaah", "eq.$jamaahId")
                }
                res.status.isSuccess()
            } else {
                val payload = buildJsonObject {
                    put("id_pengajian", idPengajian)
                    put("id_jamaah", jamaahId)
                    put("status", status)
                    put("keterangan", keterangan ?: "")
                }
                val res = client.post("$supabaseUrl/rest/v1/pengajian_presensi") {
                    supabaseHeaders()
                    header("Prefer", "resolution=merge-duplicates")
                    contentType(ContentType.Application.Json)
                    setBody(payload)
                }
                if (res.status.isSuccess()) {
                    logAction(username, "SELF_CHECKIN", "Self check-in jamaah $jamaahId untuk sesi $idPengajian: $status")
                    true
                } else {
                    false
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun changePassword(username: String, newPasswordHash: String, operatorUsername: String): Boolean {
        return try {
            val payload = buildJsonObject {
                put("password_hash", newPasswordHash)
            }
            val res = client.patch("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                parameter("username", "eq.$username")
                contentType(ContentType.Application.Json)
                setBody(payload)
            }
            if (res.status.isSuccess()) {
                logAction(operatorUsername, "CHANGE_PASSWORD", "Mengubah password untuk pengguna: $username")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun getNextJamaahId(): String {
        return try {
            val response: List<JsonObject> = client.get("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                parameter("select", "id")
            }.body()
            
            var maxIdNum = 0
            response.forEach { item ->
                val idElement = item["id"]
                val idStr = if (idElement is JsonPrimitive && idElement.isString) idElement.content else ""
                if (idStr.startsWith("J-")) {
                    val num = idStr.substring(2).toIntOrNull() ?: 0
                    if (num > maxIdNum) {
                        maxIdNum = num
                    }
                }
            }
            "J-" + String.format(java.util.Locale.US, "%03d", maxIdNum + 1)
        } catch (e: Exception) {
            e.printStackTrace()
            "J-" + String.format(java.util.Locale.US, "%03d", (100..999).random())
        }
    }

    suspend fun saveJamaah(j: Jamaah, operatorUsername: String): Boolean {
        return try {
            val payload = buildJsonObject {
                put("id", j.id)
                put("nama_lengkap", j.namaLengkap)
                put("kelompok_pengajian", j.kelompokPengajian)
                put("jenis_kelamin", j.jenisKelamin)
                put("tempat_lahir", j.tempatLahir ?: "")
                if (j.tanggalLahir.isNullOrEmpty()) put("tanggal_lahir", JsonNull) else put("tanggal_lahir", j.tanggalLahir)
                put("status_pernikahan", j.statusPernikahan ?: "")
                put("status_hubungan_keluarga", j.statusHubunganKeluarga ?: "")
                if (j.kepalaKeluargaId.isNullOrEmpty()) put("kepala_keluarga_id", JsonNull) else put("kepala_keluarga_id", j.kepalaKeluargaId)
                if (j.nomorHp.isNullOrEmpty()) put("nomor_hp", JsonNull) else put("nomor_hp", j.nomorHp)
                put("tingkat_pendidikan", j.tingkatPendidikan ?: "")
                put("pekerjaan_utama", j.pekerjaanUtama ?: "")
                put("dapuan", j.dapuan ?: "Rokyah biasa")
                put("status_ekonomi", j.statusEkonomi ?: "Menengah")
                put("kelancaran_sambung", j.kelancaranSambung ?: "Lancar")
                if (j.fotoUrl.isNullOrEmpty()) put("foto_url", JsonNull) else put("foto_url", j.fotoUrl)
            }

            val res = client.post("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                header("Prefer", "resolution=merge-duplicates")
                contentType(ContentType.Application.Json)
                setBody(payload)
            }

            if (res.status.isSuccess()) {
                logAction(operatorUsername, "SAVE_JAMAAH", "Menyimpan/mengupdate data jamaah: ${j.namaLengkap} (${j.id})")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun uploadPhoto(fileName: String, base64Data: String): String? {
        return try {
            val payload = buildJsonObject {
                put("fileName", fileName)
                put("fileBase64", base64Data)
                put("folderId", "1md8CWZ5FSjKlwAe9CrAPN8vJ71jD4osV")
            }
            val res = client.post("$supabaseUrl/functions/v1/upload-foto-drive") {
                supabaseHeaders()
                contentType(ContentType.Application.Json)
                setBody(payload)
            }
            if (res.status.isSuccess()) {
                val body = res.body<JsonObject>()
                body["url"]?.jsonPrimitive?.content
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun getAllJamaah(): List<Jamaah> {
        return try {
            client.get("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                parameter("select", "*")
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getKelompokList(): List<String> {
        return try {
            val response: List<JsonObject> = client.get("$supabaseUrl/rest/v1/master_kelompok") {
                supabaseHeaders()
                parameter("select", "nama")
            }.body()
            response.mapNotNull {
                val nameObj = it["nama"]
                if (nameObj is JsonPrimitive && nameObj.isString) nameObj.content else null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun registerLinkedUser(username: String, passwordHash: String, jamaahId: String, kelompok: String): Boolean {
        return try {
            val check: List<User> = client.get("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                parameter("username", "eq.$username")
                parameter("select", "username")
            }.body()
            if (check.isNotEmpty()) return false
            
            val payload = buildJsonObject {
                put("username", username)
                put("email", "$username@linked.aji")
                put("role", "jamaah")
                put("password_hash", passwordHash)
                put("kelompok", kelompok)
                put("jamaah_id", jamaahId)
                put("status", "pending")
            }
            val res = client.post("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                contentType(ContentType.Application.Json)
                setBody(payload)
            }
            if (res.status.isSuccess()) {
                logAction("SYSTEM", "REGISTER_PENDING", "Pendaftaran akun linked: $username menunggu persetujuan kelompok $kelompok.")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

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
    ): Boolean {
        return try {
            val check: List<User> = client.get("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                parameter("username", "eq.$username")
                parameter("select", "username")
            }.body()
            if (check.isNotEmpty()) return false

            val newJamaahId = getNextJamaahId()
            val jPayload = buildJsonObject {
                put("id", newJamaahId)
                put("nama_lengkap", namaLengkap)
                put("kelompok_pengajian", kelompok)
                put("jenis_kelamin", jenisKelamin)
                put("tempat_lahir", "")
                if (tanggalLahir.isNullOrEmpty()) put("tanggal_lahir", JsonNull) else put("tanggal_lahir", tanggalLahir)
                put("status_pernikahan", statusPernikahan ?: "")
                put("status_hubungan_keluarga", "Kepala Keluarga")
                put("kepala_keluarga_id", JsonNull)
                if (nomorHp.isNullOrEmpty()) put("nomor_hp", JsonNull) else put("nomor_hp", nomorHp)
                put("tingkat_pendidikan", "")
                put("pekerjaan_utama", "")
                put("dapuan", "Rokyah biasa")
                put("status_ekonomi", "")
                put("kelancaran_sambung", "")
                if (fotoUrl.isNullOrEmpty()) put("foto_url", JsonNull) else put("foto_url", fotoUrl)
            }
            val resJamaah = client.post("$supabaseUrl/rest/v1/jamaah") {
                supabaseHeaders()
                contentType(ContentType.Application.Json)
                setBody(jPayload)
            }
            if (!resJamaah.status.isSuccess()) return false

            val uPayload = buildJsonObject {
                put("username", username)
                put("email", "$username@jamaah.aji")
                put("role", "jamaah")
                put("password_hash", passwordHash)
                put("kelompok", kelompok)
                put("jamaah_id", newJamaahId)
                put("status", "pending")
            }
            val resUser = client.post("$supabaseUrl/rest/v1/app_users") {
                supabaseHeaders()
                contentType(ContentType.Application.Json)
                setBody(uPayload)
            }
            if (resUser.status.isSuccess()) {
                logAction("SYSTEM", "REGISTER_PENDING", "Pendaftaran jamaah baru: $namaLengkap ($username) menunggu persetujuan kelompok $kelompok.")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
