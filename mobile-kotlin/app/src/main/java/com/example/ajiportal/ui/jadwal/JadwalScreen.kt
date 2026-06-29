package com.example.ajiportal.ui.jadwal

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.example.ajiportal.data.model.Presensi
import com.example.ajiportal.data.model.MasterJenisPengajian
import com.example.ajiportal.data.model.Pengurus
import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.theme.*
import com.example.ajiportal.utils.DateUtils
import com.example.ajiportal.utils.EligibilityHelper
import com.example.ajiportal.utils.CheckInTimeState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.LocalTime
import java.time.format.TextStyle
import java.util.*

sealed interface JadwalUiState {
    object Loading : JadwalUiState
    data class Success(
        val allSchedules: List<Jadwal>,
        val myPresensi: List<Presensi>,
        val masterJenisList: List<MasterJenisPengajian>,
        val pengurusRoles: List<Pengurus>,
        val jamaah: Jamaah
    ) : JadwalUiState
    data class Error(val message: String) : JadwalUiState
}

class JadwalViewModel(private val repository: DataRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<JadwalUiState>(JadwalUiState.Loading)
    val uiState: StateFlow<JadwalUiState> = _uiState.asStateFlow()

    fun loadJadwalData() {
        viewModelScope.launch {
            _uiState.value = JadwalUiState.Loading
            try {
                val jamaah = repository.getMyProfile()
                if (jamaah == null) {
                    _uiState.value = JadwalUiState.Error("Profil jamaah tidak ditemukan.")
                    return@launch
                }
                val schedules = repository.getSchedules()
                val presensi = repository.getMyPresensi()
                val masterJenisList = repository.getMasterJenisPengajian()
                val pengurusRoles = repository.getMyPengurusRoles()
                _uiState.value = JadwalUiState.Success(
                    allSchedules = schedules,
                    myPresensi = presensi,
                    masterJenisList = masterJenisList,
                    pengurusRoles = pengurusRoles,
                    jamaah = jamaah
                )
            } catch (e: Exception) {
                _uiState.value = JadwalUiState.Error(e.message ?: "Gagal memuat jadwal.")
            }
        }
    }

    fun doCheckIn(idPengajian: Int, status: String, keterangan: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = repository.selfCheckIn(idPengajian, status, keterangan)
            if (success) {
                val jamaah = repository.getMyProfile()
                if (jamaah != null) {
                    val schedules = repository.getSchedules()
                    val presensi = repository.getMyPresensi()
                    val masterJenisList = repository.getMasterJenisPengajian()
                    val pengurusRoles = repository.getMyPengurusRoles()
                    _uiState.value = JadwalUiState.Success(
                        allSchedules = schedules,
                        myPresensi = presensi,
                        masterJenisList = masterJenisList,
                        pengurusRoles = pengurusRoles,
                        jamaah = jamaah
                    )
                }
            }
            onComplete(success)
        }
    }
}

@Composable
fun JadwalScreen(
    repository: DataRepository,
    modifier: Modifier = Modifier
) {
    val viewModel: JadwalViewModel = viewModel { JadwalViewModel(repository) }
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadJadwalData()
    }

    when (val state = uiState) {
        is JadwalUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        }
        is JadwalUiState.Error -> {
            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Text(text = state.message, color = ColorDanger, textAlign = TextAlign.Center)
            }
        }
        is JadwalUiState.Success -> {
            JadwalContent(
                state = state,
                onCheckIn = { id, status, reason, callback ->
                    viewModel.doCheckIn(id, status, reason, callback)
                },
                modifier = modifier
            )
        }
    }
}

@Composable
fun JadwalContent(
    state: JadwalUiState.Success,
    onCheckIn: (Int, String, String?, (Boolean) -> Unit) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    val today = LocalDate.now()

    var showCheckInDialog by remember { mutableStateOf<Jadwal?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Calendar Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { currentMonth = currentMonth.minusMonths(1) }) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
            }
            
            Text(
                text = "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale("id"))} ${currentMonth.year}",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            IconButton(onClick = { currentMonth = currentMonth.plusMonths(1) }) {
                Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
            }
        }

        // Calendar Grid
        CalendarGrid(
            currentMonth = currentMonth,
            selectedDate = selectedDate,
            schedules = state.allSchedules,
            presensi = state.myPresensi,
            jamaah = state.jamaah,
            masterJenisList = state.masterJenisList,
            pengurusRoles = state.pengurusRoles,
            onDateSelected = { selectedDate = it }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Selected Date Header
        Text(
            text = "Kegiatan Pengajian: ${DateUtils.formatDateIndo(selectedDate.toString())}",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        // Filter schedules for the selected day (shows ALL schedules)
        val daySchedules = remember(selectedDate, state.allSchedules) {
            state.allSchedules.filter { it.tanggal == selectedDate.toString() }
        }

        if (daySchedules.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.EventNote,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tidak ada jadwal pengajian pada tanggal ini.",
                        fontSize = 14.sp,
                        color = TextMuted
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(daySchedules) { schedule ->
                    val pr = state.myPresensi.find { it.idPengajian == schedule.id }
                    val isEligible = EligibilityHelper.isJamaahEligible(
                        state.jamaah,
                        schedule,
                        state.masterJenisList,
                        state.pengurusRoles
                    )
                    
                    ScheduleDetailCard(
                        schedule = schedule,
                        presensi = pr,
                        isToday = schedule.tanggal == today.toString(),
                        isEligible = isEligible,
                        onCheckInClick = { showCheckInDialog = schedule }
                    )
                }
            }
        }
    }

    // Check In Options Picker Dialog
    if (showCheckInDialog != null) {
        CheckInDialog(
            schedule = showCheckInDialog!!,
            onDismiss = { showCheckInDialog = null },
            onSubmit = { status, reason ->
                onCheckIn(showCheckInDialog!!.id, status, reason) { success ->
                    if (success) {
                        showCheckInDialog = null
                    }
                }
            }
        )
    }
}

@Composable
fun CalendarGrid(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    schedules: List<Jadwal>,
    presensi: List<Presensi>,
    jamaah: Jamaah,
    masterJenisList: List<MasterJenisPengajian>,
    pengurusRoles: List<Pengurus>,
    onDateSelected: (LocalDate) -> Unit
) {
    val daysInMonth = currentMonth.lengthOfMonth()
    val firstOfMonth = currentMonth.atDay(1)
    val dayOfWeekVal = firstOfMonth.dayOfWeek.value
    val offset = dayOfWeekVal - 1

    val days = mutableListOf<LocalDate?>()
    for (i in 0 until offset) {
        days.add(null)
    }
    for (i in 1..daysInMonth) {
        days.add(currentMonth.atDay(i))
    }

    val daysOfWeekHeaders = listOf("S", "S", "R", "K", "J", "S", "M")

    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        // Headers
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            daysOfWeekHeaders.forEach { header ->
                Text(
                    text = header,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Grid Rows
        val chunks = days.chunked(7)
        chunks.forEach { rowDays ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                rowDays.forEach { date ->
                    if (date == null) {
                        Spacer(modifier = Modifier.weight(1f).aspectRatio(1f))
                    } else {
                        val isSelected = date == selectedDate
                        val isToday = date == LocalDate.now()
                        
                        val daySchedules = schedules.filter { it.tanggal == date.toString() }
                        
                        val status = when {
                            daySchedules.isEmpty() -> "none"
                            else -> {
                                val eligibleDaySchedules = daySchedules.filter {
                                    EligibilityHelper.isJamaahEligible(jamaah, it, masterJenisList, pengurusRoles)
                                }
                                val prs = eligibleDaySchedules.map { s -> presensi.find { it.idPengajian == s.id } }
                                when {
                                    eligibleDaySchedules.isEmpty() -> "none"
                                    prs.any { it?.status == "Hadir Fisik" || it?.status == "Online" } -> "hadir"
                                    prs.any { it?.status == "Izin" } -> "izin"
                                    date >= LocalDate.now() -> "future"
                                    else -> "alpha"
                                }
                            }
                        }

                        val indicatorColor = when (status) {
                            "hadir" -> ColorSuccess
                            "izin" -> ColorWarning
                            "alpha" -> ColorDanger
                            "future" -> ColorInfo
                            else -> Color.Transparent
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .padding(4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    when {
                                        isSelected -> EmeraldPrimary
                                        isToday -> EmeraldLight
                                        else -> Color.Transparent
                                    }
                                )
                                .clickable { onDateSelected(date) },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = date.dayOfMonth.toString(),
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        isSelected -> Color.White
                                        isToday -> EmeraldDark
                                        else -> MaterialTheme.colorScheme.onSurface
                                    }
                                )
                                if (indicatorColor != Color.Transparent) {
                                    Box(
                                        modifier = Modifier
                                            .size(5.dp)
                                            .clip(CircleShape)
                                            .background(if (isSelected) Color.White else indicatorColor)
                                    )
                                }
                            }
                        }
                    }
                }
                if (rowDays.size < 7) {
                    for (k in 0 until (7 - rowDays.size)) {
                        Spacer(modifier = Modifier.weight(1f).aspectRatio(1f))
                    }
                }
            }
        }
    }
}

fun getCheckInTimeState(schedule: Jadwal): CheckInTimeState {
    return DateUtils.getCheckInTimeState(schedule.waktuMulai, schedule.waktuSelesai)
}

@Composable
fun ScheduleDetailCard(
    schedule: Jadwal,
    presensi: Presensi?,
    isToday: Boolean,
    isEligible: Boolean,
    onCheckInClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = schedule.jenisPengajian ?: "Pengajian",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = EmeraldDark
                )
                
                val statusText = when {
                    presensi != null -> presensi.status
                    !isEligible -> "Bukan Peserta"
                    schedule.tanggal < LocalDate.now().toString() -> "Alpha"
                    else -> "Belum Presensi"
                }

                val (badgeBg, badgeTextClr) = when (statusText) {
                    "Hadir Fisik", "Online" -> Pair(ColorSuccess.copy(alpha = 0.12f), ColorSuccess)
                    "Izin" -> Pair(ColorWarning.copy(alpha = 0.12f), ColorWarning)
                    "Bukan Peserta" -> Pair(Color.LightGray.copy(alpha = 0.3f), TextMuted)
                    else -> Pair(ColorDanger.copy(alpha = 0.12f), ColorDanger)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(badgeBg)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = statusText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = badgeTextClr
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Tingkat: ${schedule.tingkatPengajian ?: "-"}",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Text(
                text = "Jam: ${schedule.waktuMulai?.substring(0, 5) ?: "-"} - ${schedule.waktuSeleserTime()}",
                fontSize = 13.sp,
                color = TextMuted
            )

            if (!presensi?.keterangan.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Keterangan: ${presensi!!.keterangan}",
                    fontSize = 13.sp,
                    color = ColorWarning,
                    fontWeight = FontWeight.Medium
                )
            }

            if (isToday && isEligible) {
                val timeState = getCheckInTimeState(schedule)
                Spacer(modifier = Modifier.height(14.dp))
                
                when (timeState) {
                    CheckInTimeState.NOT_OPENED -> {
                        Button(
                            onClick = {},
                            enabled = false,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                disabledContainerColor = Color.LightGray.copy(alpha = 0.3f),
                                disabledContentColor = TextMuted
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Absensi Belum Dibuka", fontWeight = FontWeight.Bold)
                        }
                    }
                    CheckInTimeState.CLOSED -> {
                        Button(
                            onClick = {},
                            enabled = false,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                disabledContainerColor = Color.LightGray.copy(alpha = 0.3f),
                                disabledContentColor = TextMuted
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Absensi Sudah Ditutup", fontWeight = FontWeight.Bold)
                        }
                    }
                    CheckInTimeState.OPENED -> {
                        Button(
                            onClick = onCheckInClick,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Check-in Mandiri", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// Extension to get time string
fun Jadwal.waktuSeleserTime(): String {
    return waktuSelesai?.substring(0, 5) ?: "Selesai"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckInDialog(
    schedule: Jadwal,
    onDismiss: () -> Unit,
    onSubmit: (String, String?) -> Unit
) {
    var selectedOption by remember { mutableStateOf("Hadir Fisik") }
    var reason by remember { mutableStateOf("") }
    
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Check-in Mandiri", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Pilih kehadiran untuk pengajian ${schedule.jenisPengajian}:",
                    fontSize = 14.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Radio buttons
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val options = listOf("Hadir Fisik", "Online", "Izin")
                    options.forEach { option ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedOption = option }
                                .padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = (selectedOption == option),
                                onClick = { selectedOption = option },
                                colors = RadioButtonDefaults.colors(selectedColor = EmeraldPrimary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = option, fontSize = 15.sp)
                        }
                    }
                }

                // Show reason text input if Online or Izin is selected
                if (selectedOption == "Online" || selectedOption == "Izin") {
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        label = { Text("Alasan / Keterangan") },
                        placeholder = { Text("Contoh: Sakit kaki, Dinas luar kota") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            focusedLabelColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        maxLines = 3
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if ((selectedOption == "Online" || selectedOption == "Izin") && reason.trim().isEmpty()) {
                        Toast.makeText(context, "Harap masukkan keterangan/alasan.", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    onSubmit(selectedOption, if (selectedOption == "Hadir Fisik") null else reason)
                },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Text("Kirim", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal", color = TextMuted)
            }
        }
    )
}
