package com.example.ajiportal.ui.dashboard

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.data.model.*
import com.example.ajiportal.theme.*
import com.example.ajiportal.utils.DateUtils
import com.example.ajiportal.utils.EligibilityHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.material.icons.filled.ArrowDropDown

data class SessionAttendanceItem(
    val id: Int,
    val date: String,
    val type: String,
    val time: String,
    val status: String
)

sealed interface DashboardUiState {
    object Loading : DashboardUiState
    data class Success(
        val jamaah: Jamaah,
        val peramutan: String,
        val attendancePercent: Int,
        val totalSessions: Int,
        val countHadir: Int,
        val countIzin: Int,
        val countAlpha: Int,
        val statusTeks: String,
        val sessionAttendanceList: List<SessionAttendanceItem>
    ) : DashboardUiState
    data class Error(val message: String) : DashboardUiState
}

class DashboardViewModel(private val repository: DataRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private val _selectedTingkat = MutableStateFlow("Semua Tingkat")
    val selectedTingkat: StateFlow<String> = _selectedTingkat.asStateFlow()

    private val _selectedMonth = MutableStateFlow(DateUtils.getTodayString().substring(0, 7)) // e.g. "2026-06"
    val selectedMonth: StateFlow<String> = _selectedMonth.asStateFlow()

    private val _availableMonths = MutableStateFlow<List<String>>(emptyList())
    val availableMonths: StateFlow<List<String>> = _availableMonths.asStateFlow()

    private var cachedJamaah: Jamaah? = null
    private var cachedPeramutan: String = ""
    private var cachedEligibleSchedules: List<Jadwal> = emptyList()
    private var cachedPresensiList: List<Presensi> = emptyList()

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            try {
                val jamaah = repository.getMyProfile()
                if (jamaah == null) {
                    _uiState.value = DashboardUiState.Error("Data jamaah tidak ditemukan.")
                    return@launch
                }
                cachedJamaah = jamaah

                val schedules = repository.getSchedules()
                val presensiList = repository.getMyPresensi()
                cachedPresensiList = presensiList

                val masterJenisList = repository.getMasterJenisPengajian()
                val pengurusRoles = repository.getMyPengurusRoles()

                val eligibleSchedules = schedules.filter { 
                    EligibilityHelper.isJamaahEligible(jamaah, it, masterJenisList, pengurusRoles) 
                }
                cachedEligibleSchedules = eligibleSchedules

                val age = DateUtils.calculateAge(jamaah.tanggalLahir)
                cachedPeramutan = DateUtils.getKelompokPeramutan(age, jamaah.statusPernikahan, jamaah.tingkatPendidikan)

                // Populate available months
                val todayStr = DateUtils.getTodayString()
                val months = eligibleSchedules.map { it.tanggal.substring(0, 7) }.distinct().sortedDescending()
                val currentMonth = todayStr.substring(0, 7)
                val finalMonths = if (!months.contains(currentMonth)) {
                    (listOf(currentMonth) + months).distinct().sortedDescending()
                } else {
                    months
                }
                _availableMonths.value = finalMonths

                filterAndPopulate()
            } catch (e: Exception) {
                _uiState.value = DashboardUiState.Error(e.message ?: "Gagal memuat dashboard")
            }
        }
    }

    fun updateFilters(tingkat: String, month: String) {
        _selectedTingkat.value = tingkat
        _selectedMonth.value = month
        filterAndPopulate()
    }

    private fun filterAndPopulate() {
        val jamaah = cachedJamaah ?: return
        val schedules = cachedEligibleSchedules
        val presensiList = cachedPresensiList
        val peramutan = cachedPeramutan

        val selectedTingkatVal = _selectedTingkat.value
        val selectedMonthVal = _selectedMonth.value

        val filteredSchedules = schedules.filter { s ->
            val matchesMonth = if (selectedMonthVal == "Semua Bulan") {
                true
            } else {
                s.tanggal.startsWith(selectedMonthVal)
            }

            val filterTingkatClean = selectedTingkatVal.lowercase().replace("tingkat", "").replace(" ", "").trim()
            val matchesTingkat = if (filterTingkatClean == "semua" || filterTingkatClean == "semuatingkat" || filterTingkatClean.isEmpty()) {
                true
            } else {
                val dbTingkatClean = (s.tingkatPengajian ?: "").lowercase().replace("tingkat", "").replace(" ", "").trim()
                dbTingkatClean == filterTingkatClean
            }

            matchesMonth && matchesTingkat
        }

        val todayStr = DateUtils.getTodayString()
        val timeNow = DateUtils.getCurrentTimeShort()

        val passedSchedules = filteredSchedules.filter { s ->
            if (s.tanggal < todayStr) true
            else if (s.tanggal == todayStr) {
                val endTime = s.waktuSelesai?.substring(0, 5) ?: "23:59"
                timeNow >= endTime
            } else {
                false
            }
        }

        val totalPassed = passedSchedules.size
        var hadir = 0
        var izin = 0

        val attendanceItems = passedSchedules.map { s ->
            val pr = presensiList.find { it.idPengajian == s.id }
            val status = pr?.status ?: "Alpha"

            if (status == "Hadir Fisik" || status == "Online") {
                hadir++
            } else if (status == "Izin") {
                izin++
            }

            SessionAttendanceItem(
                id = s.id,
                date = s.tanggal,
                type = s.jenisPengajian ?: "-",
                time = s.waktuMulai?.substring(0, 5) ?: "-",
                status = status
            )
        }

        val alpha = totalPassed - hadir - izin
        val pct = if (totalPassed > 0) Math.round((hadir.toFloat() / totalPassed.toFloat()) * 100) else 0

        val targetMonthForTeks = if (selectedMonthVal == "Semua Bulan") todayStr.substring(0, 7) else selectedMonthVal
        val currentMonthTeksSchedules = schedules.filter { s ->
            val isTeks = (s.jenisPengajian ?: "").trim().lowercase() == "teks"
            val isTargetMonth = s.tanggal.startsWith(targetMonthForTeks)
            isTeks && isTargetMonth
        }

        val hasAttendedTeks = currentMonthTeksSchedules.any { s ->
            val pr = presensiList.find { it.idPengajian == s.id }
            val status = pr?.status?.trim()?.lowercase() ?: ""
            status == "hadir fisik" || status == "online"
        }

        val statusTeks = if (hasAttendedTeks) "Sudah" else "Belum"

        _uiState.value = DashboardUiState.Success(
            jamaah = jamaah,
            peramutan = peramutan,
            attendancePercent = pct,
            totalSessions = totalPassed,
            countHadir = hadir,
            countIzin = izin,
            countAlpha = alpha,
            statusTeks = statusTeks,
            sessionAttendanceList = attendanceItems
        )
    }
}

@Composable
fun DashboardScreen(
    repository: DataRepository,
    modifier: Modifier = Modifier
) {
    val viewModel: DashboardViewModel = viewModel { DashboardViewModel(repository) }
    val uiState by viewModel.uiState.collectAsState()
    val selectedTingkat by viewModel.selectedTingkat.collectAsState()
    val selectedMonth by viewModel.selectedMonth.collectAsState()
    val availableMonths by viewModel.availableMonths.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadDashboardData()
    }

    when (val state = uiState) {
        is DashboardUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        }
        is DashboardUiState.Error -> {
            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Text(
                    text = state.message,
                    color = ColorDanger,
                    textAlign = TextAlign.Center
                )
            }
        }
        is DashboardUiState.Success -> {
            DashboardContent(
                state = state,
                selectedTingkat = selectedTingkat,
                selectedMonth = selectedMonth,
                availableMonths = availableMonths,
                onFilterChange = { tingkat, month -> viewModel.updateFilters(tingkat, month) },
                modifier = modifier
            )
        }
    }
}

@Composable
fun DashboardContent(
    state: DashboardUiState.Success,
    selectedTingkat: String,
    selectedMonth: String,
    availableMonths: List<String>,
    onFilterChange: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Dropdown Filters Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                var tingkatExpanded by remember { mutableStateOf(false) }
                val tingkatOptions = listOf("Semua Tingkat", "Tingkat Daerah", "Tingkat Desa", "Tingkat Kelompok")
                
                Box(modifier = Modifier.weight(1f)) {
                    OutlinedButton(
                        onClick = { tingkatExpanded = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldDark),
                        border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.5f)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = selectedTingkat,
                                fontSize = 12.sp,
                                maxLines = 1,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    DropdownMenu(
                        expanded = tingkatExpanded,
                        onDismissRequest = { tingkatExpanded = false }
                    ) {
                        tingkatOptions.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option, fontSize = 13.sp) },
                                onClick = {
                                    tingkatExpanded = false
                                    onFilterChange(option, selectedMonth)
                                }
                            )
                        }
                    }
                }

                var monthExpanded by remember { mutableStateOf(false) }
                Box(modifier = Modifier.weight(1f)) {
                    OutlinedButton(
                        onClick = { monthExpanded = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldDark),
                        border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.5f)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = DateUtils.formatMonthYearIndo(selectedMonth),
                                fontSize = 12.sp,
                                maxLines = 1,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    DropdownMenu(
                        expanded = monthExpanded,
                        onDismissRequest = { monthExpanded = false }
                    ) {
                        availableMonths.forEach { monthVal ->
                            DropdownMenuItem(
                                text = { Text(DateUtils.formatMonthYearIndo(monthVal), fontSize = 13.sp) },
                                onClick = {
                                    monthExpanded = false
                                    onFilterChange(selectedTingkat, monthVal)
                                }
                            )
                        }
                    }
                }
            }
        }
        // 1. Profile card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val fallbackName = state.jamaah.namaLengkap
                    val fallbackChar = if (fallbackName.isNotEmpty()) fallbackName.first().uppercase() else "U"
                    
                    if (!state.jamaah.fotoUrl.isNullOrEmpty()) {
                        AsyncImage(
                            model = state.jamaah.fotoUrl,
                            contentDescription = "Profile Photo",
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .border(2.dp, EmeraldPrimary, CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(EmeraldLight, CircleShape)
                                .border(2.dp, EmeraldPrimary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = fallbackChar,
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column {
                        Text(
                            text = state.jamaah.namaLengkap,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${state.jamaah.kelompokPengajian} • ${state.peramutan}",
                            fontSize = 14.sp,
                            color = TextMuted
                        )
                        Text(
                            text = if (!state.jamaah.dapuan.isNullOrEmpty()) "Dapuan: ${state.jamaah.dapuan}" else "Dapuan: -",
                            fontSize = 12.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }

        // 2. Attendance Gauge & Stats
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Gauge Visual representation
                    Box(
                        modifier = Modifier.size(120.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val animatedPercent by animateFloatAsState(
                            targetValue = state.attendancePercent.toFloat() / 100f,
                            animationSpec = tween(durationMillis = 1000)
                        )
                        
                        val strokeColor = when {
                            state.attendancePercent >= 75 -> ColorSuccess
                            state.attendancePercent >= 50 -> ColorWarning
                            else -> ColorDanger
                        }

                        Canvas(modifier = Modifier.fillMaxSize()) {
                            // Background track
                            drawCircle(
                                color = Color.LightGray.copy(alpha = 0.3f),
                                style = Stroke(width = 10.dp.toPx())
                            )
                            // Filled path
                            drawArc(
                                color = strokeColor,
                                startAngle = -90f,
                                sweepAngle = animatedPercent * 360f,
                                useCenter = false,
                                style = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "${state.attendancePercent}%",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = strokeColor
                            )
                            Text(
                                text = "Kehadiran",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(24.dp))

                    // Counters Grid
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatRow(label = "Hadir", count = state.countHadir, color = ColorSuccess)
                        StatRow(label = "Izin", count = state.countIzin, color = ColorWarning)
                        StatRow(label = "Alpha", count = state.countAlpha, color = ColorDanger)
                        Divider()
                        StatRow(label = "Total Sesi", count = state.totalSessions, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }

        // 3. Teks pengajian status banner
        item {
            val isSudah = state.statusTeks == "Sudah"
            val bannerColor = if (isSudah) ColorSuccess else ColorDanger
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, bannerColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = bannerColor.copy(alpha = 0.08f)),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (isSudah) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = bannerColor,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Status Pengajian Teks Bulan Ini",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                        Text(
                            text = if (isSudah) "SUDAH MENGIKUTI" else "BELUM MENGIKUTI",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = bannerColor
                        )
                    }
                }
            }
        }

        // Section Title for Sessions
        item {
            Text(
                text = "Daftar Sesi Pengajian Diikuti",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        // 4. Attended Sessions List
        if (state.sessionAttendanceList.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Box(
                        modifier = Modifier.padding(24.dp).fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Belum ada sesi pengajian tercatat.",
                            color = TextMuted,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        } else {
            items(state.sessionAttendanceList) { item ->
                SessionItemRow(item = item)
            }
        }
    }
}

@Composable
fun StatRow(label: String, count: Int, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 14.sp, color = TextMuted)
        Text(text = count.toString(), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
fun SessionItemRow(item: SessionAttendanceItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.type,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${DateUtils.formatDateIndo(item.date)} • ${item.time}",
                    fontSize = 13.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
            
            val (badgeText, badgeBg, badgeTextClr) = when (item.status) {
                "Hadir Fisik" -> Triple("Hadir Fisik", ColorSuccess.copy(alpha = 0.12f), ColorSuccess)
                "Online" -> Triple("Online", ColorSuccess.copy(alpha = 0.12f), ColorSuccess)
                "Izin" -> Triple("Izin", ColorWarning.copy(alpha = 0.12f), ColorWarning)
                else -> Triple("Alpha", ColorDanger.copy(alpha = 0.12f), ColorDanger)
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(badgeBg)
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = badgeText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = badgeTextClr
                )
            }
        }
    }
}
