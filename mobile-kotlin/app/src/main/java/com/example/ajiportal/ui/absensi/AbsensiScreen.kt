package com.example.ajiportal.ui.absensi

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.data.model.Jadwal
import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.data.model.Presensi
import com.example.ajiportal.data.model.Pengurus
import com.example.ajiportal.theme.*
import com.example.ajiportal.ui.components.IslamicMedallion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

sealed interface AbsensiUiState {
    object Loading : AbsensiUiState
    data class Success(
        val schedules: List<Jadwal>,
        val allJamaah: List<Jamaah>,
        val pengurusRoles: List<Pengurus>,
        val myRole: String,
        val userKelompok: String
    ) : AbsensiUiState
    data class Error(val message: String) : AbsensiUiState
}

class AbsensiViewModel(private val repository: DataRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<AbsensiUiState>(AbsensiUiState.Loading)
    val uiState: StateFlow<AbsensiUiState> = _uiState.asStateFlow()

    private val _presensiMap = MutableStateFlow<Map<String, Presensi>>(emptyMap())
    val presensiMap: StateFlow<Map<String, Presensi>> = _presensiMap.asStateFlow()

    var activeSchedule: Jadwal? = null
        private set

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = AbsensiUiState.Loading
            try {
                val schedules = repository.getSchedules()
                val jamaahList = repository.getAllJamaah()
                val pengurus = repository.getMyPengurusRoles()
                val role = repository.sessionManager.getRole() ?: "jamaah"
                val userKelompok = repository.sessionManager.getKelompok() ?: ""
                
                val roleLower = role.lowercase().trim()
                val isRestricted = roleLower == "operator kelompok" || roleLower == "pengurus kelompok" || roleLower == "jamaah" || roleLower == "user"
                
                val filteredSchedules = if (isRestricted && userKelompok.isNotBlank()) {
                    schedules.filter { s ->
                        val tk = (s.tingkatPengajian ?: "").lowercase()
                        val isKelompok = tk.contains("kelompok") || (!tk.contains("desa") && !tk.contains("daerah"))
                        if (isKelompok) {
                            val sk = (s.kelompokPengajian ?: "").trim().lowercase()
                            val jk = userKelompok.trim().lowercase()
                            sk == jk
                        } else {
                            true
                        }
                    }
                } else {
                    schedules
                }
                
                // Find today's active schedule from the filtered list
                activeSchedule = findActiveSchedule(filteredSchedules)
                
                _uiState.value = AbsensiUiState.Success(
                    schedules = filteredSchedules,
                    allJamaah = jamaahList,
                    pengurusRoles = pengurus,
                    myRole = role,
                    userKelompok = userKelompok
                )

                activeSchedule?.let {
                    loadPresensiForSession(it.id)
                }
            } catch (e: Exception) {
                _uiState.value = AbsensiUiState.Error(e.message ?: "Gagal memuat data absensi.")
            }
        }
    }

    fun loadPresensiForSession(sessionId: Int) {
        viewModelScope.launch {
            try {
                val presensiList = repository.getPresensiForSession(sessionId)
                _presensiMap.value = presensiList.associateBy { it.idJamaah }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updatePresensi(sessionId: Int, jamaahId: String, status: String, keterangan: String?, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = repository.submitPresensi(sessionId, jamaahId, status, keterangan)
            if (success) {
                loadPresensiForSession(sessionId)
            }
            onResult(success)
        }
    }

    private fun findActiveSchedule(schedules: List<Jadwal>): Jadwal? {
        val todayStr = LocalDate.now().toString()
        val todaySchedules = schedules.filter { it.tanggal == todayStr }
        if (todaySchedules.isEmpty()) return null

        val nowTime = LocalTime.now()
        return todaySchedules.find { schedule ->
            val startStr = schedule.waktuMulai
            val endStr = schedule.waktuSelesai
            if (startStr != null) {
                val startTime = parseLocalTime(startStr)
                val endTime = if (endStr != null) parseLocalTime(endStr) else startTime?.plusHours(2)
                if (startTime != null && endTime != null) {
                    !nowTime.isBefore(startTime) && !nowTime.isAfter(endTime)
                } else {
                    false
                }
            } else {
                false
            }
        } ?: todaySchedules.firstOrNull()
    }

    private fun parseLocalTime(timeStr: String): LocalTime? {
        return try {
            val clean = timeStr.trim()
            val parts = clean.split(":")
            if (parts.size >= 2) {
                val hour = parts[0].toIntOrNull() ?: 0
                val min = parts[1].toIntOrNull() ?: 0
                val sec = if (parts.size >= 3) parts[2].toIntOrNull() ?: 0 else 0
                LocalTime.of(hour, min, sec)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsensiScreen(
    repository: DataRepository,
    modifier: Modifier = Modifier
) {
    val viewModel: AbsensiViewModel = viewModel { AbsensiViewModel(repository) }
    val uiState by viewModel.uiState.collectAsState()
    val presensiMap by viewModel.presensiMap.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    when (val state = uiState) {
        is AbsensiUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        }
        is AbsensiUiState.Error -> {
            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Text(text = state.message, color = ColorDanger, textAlign = TextAlign.Center)
            }
        }
        is AbsensiUiState.Success -> {
            var searchQuery by remember { mutableStateOf("") }
            // Filter today's schedules & define wildcard visible sessions
            val todayStr = LocalDate.now().toString()
            val todaySchedules = state.schedules.filter { it.tanggal == todayStr }
            
            // Show today's sessions, or fallback to the latest 5 sessions in the database
            val visibleSessions = remember(todaySchedules, state.schedules) {
                if (todaySchedules.isNotEmpty()) {
                    todaySchedules
                } else {
                    state.schedules.sortedByDescending { it.tanggal + " " + (it.waktuMulai ?: "") }.take(5)
                }
            }

            var selectedSession by remember { mutableStateOf<Jadwal?>(null) }
            
            LaunchedEffect(viewModel.activeSchedule, visibleSessions) {
                if (selectedSession == null) {
                    selectedSession = viewModel.activeSchedule ?: visibleSessions.firstOrNull()
                }
            }

            LaunchedEffect(selectedSession) {
                selectedSession?.let {
                    viewModel.loadPresensiForSession(it.id)
                }
            }

            // Check if current user is authorized (admin/operator/pengurus)
            val isAuthorized = remember(state.myRole, state.pengurusRoles) {
                state.myRole.lowercase() == "admin" || 
                state.myRole.lowercase() == "operator" || 
                state.pengurusRoles.isNotEmpty()
            }

            val canEditOrDelete = remember(state.myRole) {
                state.myRole.lowercase() == "admin" || 
                state.myRole.lowercase() == "operator"
            }

            var dialogTargetJamaah by remember { mutableStateOf<Pair<Jamaah, String>?>(null) } // Jamaah and Status (Online/Izin)
            var dialogKeterangan by remember { mutableStateOf("") }
            var isSubmittingPresensi by remember { mutableStateOf(false) }

            Box(
                modifier = modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Subtle Islamic watermark pattern in background
                IslamicMedallion(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .fillMaxSize(0.7f),
                    color = EmeraldPrimary.copy(alpha = 0.03f)
                )

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    // Header/Warning if not authorized
                    if (!canEditOrDelete) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = ColorInfo.copy(alpha = 0.1f)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, ColorInfo.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = ColorInfo,
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Text(
                                    text = "Mode Kehadiran: Anda dapat mencatat kehadiran. Edit atau hapus kehadiran hanya dapat dilakukan oleh Admin/Operator.",
                                    fontSize = 12.sp,
                                    color = ColorInfo,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    // Active Session Selector Card (Displayed directly without dropdown)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = if (todaySchedules.isNotEmpty()) "Pilih Sesi Pengajian Hari Ini" else "Pilih Sesi Pengajian Terbaru",
                                fontSize = 13.sp,
                                color = EmeraldDark,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(10.dp))

                            if (visibleSessions.isEmpty()) {
                                Text(
                                    text = "Tidak ada jadwal pengajian tersedia.",
                                    fontSize = 14.sp,
                                    color = TextMuted,
                                    fontWeight = FontWeight.Medium
                                )
                            } else {
                                // Horizontal Row of selectable sessions (Direct Selection)
                                androidx.compose.foundation.lazy.LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    contentPadding = PaddingValues(vertical = 4.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    items(visibleSessions) { s ->
                                        val isSelected = selectedSession?.id == s.id
                                        val chipColor = if (isSelected) EmeraldPrimary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                        val textColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                                        val borderColor = if (isSelected) EmeraldPrimary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                                        
                                        Box(
                                            modifier = Modifier
                                                .background(chipColor, RoundedCornerShape(12.dp))
                                                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                                .clickable {
                                                    selectedSession = s
                                                }
                                                .padding(horizontal = 14.dp, vertical = 8.dp)
                                        ) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(
                                                    text = s.jenisPengajian ?: "Pengajian",
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = textColor
                                                )
                                                Text(
                                                    text = if (s.tanggal == todayStr) "Hari Ini (${s.waktuMulai ?: ""})" else "${s.tanggal} (${s.waktuMulai ?: ""})",
                                                    fontSize = 10.sp,
                                                    color = if (isSelected) Color.White.copy(alpha = 0.8f) else TextMuted
                                                )
                                            }
                                        }
                                    }
                                }

                                selectedSession?.let { s ->
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Text(
                                        text = "Detail Materi & Pengajar:",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldDark
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = formatMateriPengajar(s.materiPengajar),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        lineHeight = 18.sp
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Tingkat: ${s.tingkatPengajian ?: "Umum"} | Kelompok: ${s.kelompokPengajian ?: "Semua"}",
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                }
                            }
                        }
                    }

                    // Search input
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        label = { Text("Cari Nama Jamaah") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = EmeraldPrimary) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            focusedLabelColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Jamaah list
                    if (selectedSession == null) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Silakan pilih sesi pengajian terlebih dahulu.",
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                        }
                    } else {
                        val session = selectedSession!!
                        val filteredJamaah = remember(searchQuery, state.allJamaah, state.myRole, state.userKelompok, session) {
                            val roleLower = state.myRole.lowercase().trim()
                            val isRestricted = roleLower == "operator kelompok" || roleLower == "pengurus kelompok" || roleLower == "jamaah" || roleLower == "user"
                            
                            val baseList = if (isRestricted && state.userKelompok.isNotBlank()) {
                                state.allJamaah.filter { j ->
                                    j.kelompokPengajian.trim().lowercase() == state.userKelompok.trim().lowercase()
                                }
                            } else {
                                val sessionKelompok = (session.kelompokPengajian ?: "").trim()
                                if (sessionKelompok.isNotEmpty() && sessionKelompok != "Semua" && sessionKelompok != "Desa" && sessionKelompok != "Daerah") {
                                    state.allJamaah.filter { j ->
                                        j.kelompokPengajian.trim().lowercase() == sessionKelompok.lowercase()
                                    }
                                } else {
                                    state.allJamaah
                                }
                            }

                            if (searchQuery.trim().isEmpty()) {
                                emptyList()
                            } else {
                                baseList.filter {
                                    it.namaLengkap.contains(searchQuery, ignoreCase = true)
                                }
                            }
                        }

                        if (searchQuery.trim().isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = TextMuted.copy(alpha = 0.5f),
                                        modifier = Modifier.size(64.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Ketik nama jamaah pada kolom pencarian untuk melakukan absensi.",
                                        fontSize = 13.sp,
                                        color = TextMuted,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(horizontal = 32.dp)
                                    )
                                }
                            }
                        } else if (filteredJamaah.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Jamaah dengan nama \"$searchQuery\" tidak ditemukan.",
                                    color = TextMuted,
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(filteredJamaah) { j ->
                                    val presensi = presensiMap[j.id]
                                    JamaahAbsensiCard(
                                        jamaah = j,
                                        presensi = presensi,
                                        canEditOrDelete = canEditOrDelete,
                                        onStatusSelected = { status ->
                                            if (status == "Hadir Fisik") {
                                                isSubmittingPresensi = true
                                                viewModel.updatePresensi(session.id, j.id, "Hadir Fisik", null) { success ->
                                                    isSubmittingPresensi = false
                                                    if (success) {
                                                        Toast.makeText(context, "Presensi ${j.namaLengkap} berhasil disimpan.", Toast.LENGTH_SHORT).show()
                                                    } else {
                                                        Toast.makeText(context, "Gagal mengirim presensi.", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            } else {
                                                // Online or Izin, require dialog for description
                                                dialogTargetJamaah = Pair(j, status)
                                                dialogKeterangan = presensi?.keterangan ?: ""
                                            }
                                        },
                                        onReset = {
                                            isSubmittingPresensi = true
                                            viewModel.updatePresensi(session.id, j.id, "Alpha", null) { success ->
                                                isSubmittingPresensi = false
                                                if (success) {
                                                    Toast.makeText(context, "Presensi ${j.namaLengkap} berhasil direset.", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Keterangan / Alasan input Dialog for Online & Izin
            if (dialogTargetJamaah != null && selectedSession != null) {
                val (jamaah, status) = dialogTargetJamaah!!
                val session = selectedSession!!

                AlertDialog(
                    onDismissRequest = { dialogTargetJamaah = null },
                    title = {
                        Text(
                            text = "Presensi: $status",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    },
                    text = {
                        Column {
                            Text(
                                text = "Masukkan keterangan/alasan untuk ${jamaah.namaLengkap}:",
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            OutlinedTextField(
                                value = dialogKeterangan,
                                onValueChange = { dialogKeterangan = it },
                                label = { Text("Keterangan/Alasan") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldPrimary,
                                    focusedLabelColor = EmeraldPrimary
                                )
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                isSubmittingPresensi = true
                                viewModel.updatePresensi(session.id, jamaah.id, status, dialogKeterangan) { success ->
                                    isSubmittingPresensi = false
                                    dialogTargetJamaah = null
                                    if (success) {
                                        Toast.makeText(context, "Presensi $status untuk ${jamaah.namaLengkap} disimpan.", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "Gagal menyimpan presensi.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                            enabled = !isSubmittingPresensi
                        ) {
                            Text("Simpan", color = Color.White)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { dialogTargetJamaah = null }) {
                            Text("Batal", color = EmeraldDark)
                        }
                    },
                    shape = RoundedCornerShape(16.dp)
                )
            }
        }
    }
}

@Composable
fun JamaahAbsensiCard(
    jamaah: Jamaah,
    presensi: Presensi?,
    canEditOrDelete: Boolean,
    onStatusSelected: (String) -> Unit,
    onReset: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Profile & Name row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(EmeraldLight, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = EmeraldDark
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = jamaah.namaLengkap,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Kelompok: ${jamaah.kelompokPengajian} | JK: ${jamaah.jenisKelamin}",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                    if (presensi != null && !presensi.keterangan.isNullOrEmpty()) {
                        Text(
                            text = "Keterangan: ${presensi.keterangan}",
                            fontSize = 11.sp,
                            color = ColorDanger,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }

                // Current Presence Status Badge (Short text only, no layout wrapping)
                presensi?.let { pr ->
                    if (pr.status != "Alpha") {
                        val badgeColor = when (pr.status) {
                            "Hadir Fisik" -> Color(0xFF10B981) // Emerald Green
                            "Online" -> Color(0xFF3B82F6) // Blue
                            "Izin" -> Color(0xFFF59E0B) // Amber
                            else -> Color.Gray
                        }

                        Box(
                            modifier = Modifier
                                .background(badgeColor.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                                .border(1.dp, badgeColor.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = pr.status,
                                color = badgeColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val isRecorded = presensi != null && presensi.status != "Alpha"
                val isActionEnabled = !isRecorded || canEditOrDelete
                
                OutlinedButton(
                    onClick = { onStatusSelected("Hadir Fisik") },
                    enabled = isActionEnabled,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = EmeraldDark
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = if (isActionEnabled) 0.4f else 0.1f))
                ) {
                    Text("Fisik", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { onStatusSelected("Online") },
                    enabled = isActionEnabled,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ColorInfo
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ColorInfo.copy(alpha = if (isActionEnabled) 0.4f else 0.1f))
                ) {
                    Text("Online", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { onStatusSelected("Izin") },
                    enabled = isActionEnabled,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ColorWarning
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ColorWarning.copy(alpha = if (isActionEnabled) 0.4f else 0.1f))
                ) {
                    Text("Izin", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                if (isRecorded && canEditOrDelete) {
                    IconButton(
                        onClick = onReset,
                        modifier = Modifier
                            .size(32.dp)
                            .background(ColorDanger.copy(alpha = 0.08f), RoundedCornerShape(8.dp))
                            .border(1.dp, ColorDanger.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = "Reset Absensi",
                            tint = ColorDanger,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

fun formatMateriPengajar(jsonStr: String?): String {
    if (jsonStr.isNullOrEmpty()) return "-"
    return try {
        val jsonArray = Json.parseToJsonElement(jsonStr).jsonArray
        if (jsonArray.isEmpty()) return "-"
        jsonArray.map { element ->
            val obj = element.jsonObject
            val materi = obj["materi"]?.jsonPrimitive?.content ?: ""
            val pengajar = obj["pengajar_nama"]?.jsonPrimitive?.content ?: ""
            if (materi.isNotEmpty() && pengajar.isNotEmpty()) {
                "$materi (Ustadz/Ustadzah: $pengajar)"
            } else if (materi.isNotEmpty()) {
                materi
            } else {
                pengajar
            }
        }.joinToString("\n• ", prefix = "• ")
    } catch (e: Exception) {
        jsonStr
    }
}
