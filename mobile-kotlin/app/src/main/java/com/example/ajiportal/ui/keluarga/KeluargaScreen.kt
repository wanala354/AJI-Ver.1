package com.example.ajiportal.ui.keluarga

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
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.theme.*
import com.example.ajiportal.utils.DateUtils
import com.example.ajiportal.utils.EligibilityHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.launch
import androidx.compose.ui.platform.LocalContext
import android.net.Uri
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import android.util.Base64

data class FamilySessionAttendanceItem(
    val id: Int,
    val date: String,
    val type: String,
    val time: String,
    val status: String
)

sealed interface FamilyDetailUiState {
    object Idle : FamilyDetailUiState
    object Loading : FamilyDetailUiState
    data class Success(
        val member: Jamaah,
        val attendancePercent: Int,
        val totalSessions: Int,
        val countHadir: Int,
        val countIzin: Int,
        val countAlpha: Int,
        val statusTeks: String,
        val attendanceList: List<FamilySessionAttendanceItem>
    ) : FamilyDetailUiState
    data class Error(val message: String) : FamilyDetailUiState
}

sealed interface KeluargaUiState {
    object Loading : KeluargaUiState
    data class Success(val members: List<Jamaah>, val myProfile: Jamaah) : KeluargaUiState
    data class Error(val message: String) : KeluargaUiState
}

class KeluargaViewModel(private val repository: DataRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<KeluargaUiState>(KeluargaUiState.Loading)
    val uiState: StateFlow<KeluargaUiState> = _uiState.asStateFlow()

    private val _detailState = MutableStateFlow<FamilyDetailUiState>(FamilyDetailUiState.Idle)
    val detailState: StateFlow<FamilyDetailUiState> = _detailState.asStateFlow()

    fun loadFamily() {
        viewModelScope.launch {
            _uiState.value = KeluargaUiState.Loading
            try {
                val family = repository.getFamily()
                val myProfile = repository.getMyProfile()
                if (myProfile == null) {
                    _uiState.value = KeluargaUiState.Error("Profil Anda tidak ditemukan.")
                    return@launch
                }
                _uiState.value = KeluargaUiState.Success(family, myProfile)
            } catch (e: Exception) {
                _uiState.value = KeluargaUiState.Error(e.message ?: "Gagal memuat daftar keluarga")
            }
        }
    }

    fun loadMemberDetails(member: Jamaah) {
        viewModelScope.launch {
            _detailState.value = FamilyDetailUiState.Loading
            try {
                val schedules = repository.getSchedules()
                val masterJenisList = repository.getMasterJenisPengajian()
                val presensiList = repository.getFamilyPresensi(member.id)
                val pengurusRoles = repository.getFamilyPengurusRoles(member.id)

                val eligibleSchedules = schedules.filter { 
                    EligibilityHelper.isJamaahEligible(member, it, masterJenisList, pengurusRoles) 
                }
                
                val todayStr = DateUtils.getTodayString()
                val timeNow = DateUtils.getCurrentTimeShort()

                val passedSchedules = eligibleSchedules.filter { s ->
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
                    
                    FamilySessionAttendanceItem(
                        id = s.id,
                        date = s.tanggal,
                        type = s.jenisPengajian ?: "-",
                        time = s.waktuMulai?.substring(0, 5) ?: "-",
                        status = status
                    )
                }

                val alpha = totalPassed - hadir - izin
                val pct = if (totalPassed > 0) Math.round((hadir.toFloat() / totalPassed.toFloat()) * 100) else 0

                // Teks status for the current month
                val currentYearMonth = todayStr.substring(0, 7)
                val currentMonthTeksSchedules = eligibleSchedules.filter { s ->
                    val isTeks = (s.jenisPengajian ?: "").trim().lowercase() == "teks"
                    val isCurrentMonth = s.tanggal.startsWith(currentYearMonth)
                    isTeks && isCurrentMonth
                }
                
                val hasAttendedTeks = currentMonthTeksSchedules.any { s ->
                    val pr = presensiList.find { it.idPengajian == s.id }
                    val status = pr?.status?.trim()?.lowercase() ?: ""
                    status == "hadir fisik" || status == "online"
                }

                val statusTeks = if (hasAttendedTeks) "Sudah" else "Belum"

                _detailState.value = FamilyDetailUiState.Success(
                    member = member,
                    attendancePercent = pct,
                    totalSessions = totalPassed,
                    countHadir = hadir,
                    countIzin = izin,
                    countAlpha = alpha,
                    statusTeks = statusTeks,
                    attendanceList = attendanceItems
                )
            } catch (e: Exception) {
                _detailState.value = FamilyDetailUiState.Error(e.message ?: "Gagal memuat statistik detail.")
            }
        }
    }

    fun clearDetailState() {
        _detailState.value = FamilyDetailUiState.Idle
    }
}

@Composable
fun KeluargaScreen(
    repository: DataRepository,
    modifier: Modifier = Modifier
) {
    val viewModel: KeluargaViewModel = viewModel { KeluargaViewModel(repository) }
    val uiState by viewModel.uiState.collectAsState()
    val detailState by viewModel.detailState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadFamily()
    }

    var showDetailsDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var editingMember by remember { mutableStateOf<Jamaah?>(null) }

    if (showDetailsDialog) {
        FamilyMemberDetailDialog(
            detailState = detailState,
            onDismiss = {
                showDetailsDialog = false
                viewModel.clearDetailState()
            }
        )
    }

    if (showEditDialog) {
        val successState = uiState as? KeluargaUiState.Success
        if (successState != null) {
            FamilyMemberEditDialog(
                member = editingMember,
                myProfile = successState.myProfile,
                repository = repository,
                onDismiss = { showEditDialog = false },
                onSave = {
                    showEditDialog = false
                    viewModel.loadFamily()
                }
            )
        }
    }

    when (val state = uiState) {
        is KeluargaUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary)
            }
        }
        is KeluargaUiState.Error -> {
            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Text(text = state.message, color = ColorDanger, textAlign = TextAlign.Center)
            }
        }
        is KeluargaUiState.Success -> {
            KeluargaContent(
                members = state.members,
                myProfile = state.myProfile,
                onViewDetails = { member ->
                    viewModel.loadMemberDetails(member)
                    showDetailsDialog = true
                },
                onEditClick = { member ->
                    editingMember = member
                    showEditDialog = true
                },
                onAddClick = {
                    editingMember = null
                    showEditDialog = true
                },
                modifier = modifier
            )
        }
    }
}

@Composable
fun KeluargaContent(
    members: List<Jamaah>,
    myProfile: Jamaah,
    onViewDetails: (Jamaah) -> Unit,
    onEditClick: (Jamaah) -> Unit,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Keluarga Saya",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            
            if (myProfile.statusHubunganKeluarga?.trim()?.lowercase() == "kepala keluarga") {
                Button(
                    onClick = onAddClick,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("Tambah Anggota", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
        
        Text(
            text = "Daftar anggota keluarga yang terdaftar dalam satu Kartu Keluarga (KK).",
            fontSize = 13.sp,
            color = TextMuted,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (members.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "Tidak ada anggota keluarga ditemukan.", color = TextMuted)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(members) { member ->
                    val canEdit = myProfile.statusHubunganKeluarga?.trim()?.lowercase() == "kepala keluarga" || member.id == myProfile.id
                    FamilyMemberCard(
                        member = member,
                        canEdit = canEdit,
                        onViewDetails = { onViewDetails(member) },
                        onEditClick = { onEditClick(member) }
                    )
                }
            }
        }
    }
}

@Composable
fun FamilyMemberCard(
    member: Jamaah,
    canEdit: Boolean,
    onViewDetails: () -> Unit,
    onEditClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                val fallbackName = member.namaLengkap
                val fallbackChar = if (fallbackName.isNotEmpty()) fallbackName.first().uppercase() else "U"

                if (!member.fotoUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = member.fotoUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(60.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, EmeraldPrimary, CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(EmeraldLight, CircleShape)
                            .border(1.5.dp, EmeraldPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = fallbackChar,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = EmeraldDark
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = member.namaLengkap,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f, fill = false)
                        )

                        // Relationship Badge
                        val relation = member.statusHubunganKeluarga ?: "Anggota"
                        val (badgeBg, badgeTextClr) = when (relation.trim().lowercase()) {
                            "kepala keluarga" -> Pair(ColorSuccess.copy(alpha = 0.12f), ColorSuccess)
                            "istri" -> Pair(ColorInfo.copy(alpha = 0.12f), ColorInfo)
                            "anak" -> Pair(EmeraldPrimary.copy(alpha = 0.12f), EmeraldPrimary)
                            else -> Pair(Color.LightGray.copy(alpha = 0.3f), TextMuted)
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(badgeBg)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = relation,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = badgeTextClr
                            )
                        }
                    }

                    Text(
                        text = "${member.jenisKelamin} • ${DateUtils.calculateAge(member.tanggalLahir)} Tahun",
                        fontSize = 13.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 2.dp)
                    )

                    if (!member.nomorHp.isNullOrEmpty()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(top = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Call,
                                contentDescription = null,
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = member.nomorHp,
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (canEdit) {
                    TextButton(
                        onClick = onEditClick,
                        colors = ButtonDefaults.textButtonColors(contentColor = EmeraldPrimary)
                    ) {
                        Text(
                            text = "Edit Biodata",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                }
                
                TextButton(
                    onClick = onViewDetails,
                    colors = ButtonDefaults.textButtonColors(contentColor = EmeraldPrimary)
                ) {
                    Text(
                        text = "Lihat Detail & Absensi",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyMemberDetailDialog(
    detailState: FamilyDetailUiState,
    onDismiss: () -> Unit
) {
    var activeTab by remember { mutableStateOf(0) }

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(
            usePlatformDefaultWidth = false
        ),
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.9f)
            .padding(16.dp),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Detail Anggota Keluarga",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = TextMuted
                    )
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxSize()) {
                TabRow(
                    selectedTabIndex = activeTab,
                    containerColor = Color.Transparent,
                    contentColor = EmeraldPrimary,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[activeTab]),
                            color = EmeraldPrimary
                        )
                    }
                ) {
                    Tab(
                        selected = activeTab == 0,
                        onClick = { activeTab = 0 },
                        text = { Text("Biodata Lengkap", fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                    )
                    Tab(
                        selected = activeTab == 1,
                        onClick = { activeTab = 1 },
                        text = { Text("Statistik Absensi", fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                when (detailState) {
                    is FamilyDetailUiState.Idle, is FamilyDetailUiState.Loading -> {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = EmeraldPrimary)
                        }
                    }
                    is FamilyDetailUiState.Error -> {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = detailState.message,
                                color = ColorDanger,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    is FamilyDetailUiState.Success -> {
                        Box(modifier = Modifier.weight(1f)) {
                            if (activeTab == 0) {
                                FamilyBiodataTab(member = detailState.member)
                            } else {
                                FamilyKehadiranTab(state = detailState)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = EmeraldPrimary)
            ) {
                Text("Tutup", fontWeight = FontWeight.Bold)
            }
        }
    )
}

@Composable
fun FamilyBiodataTab(member: Jamaah) {
    val age = DateUtils.calculateAge(member.tanggalLahir)
    val peramutan = DateUtils.getKelompokPeramutan(age, member.statusPernikahan, member.tingkatPendidikan)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!member.fotoUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = member.fotoUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(70.dp)
                            .clip(CircleShape)
                            .border(2.dp, EmeraldPrimary, CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    val fallbackChar = if (member.namaLengkap.isNotEmpty()) member.namaLengkap.first().uppercase() else "U"
                    Box(
                        modifier = Modifier
                            .size(70.dp)
                            .background(EmeraldLight, CircleShape)
                            .border(2.dp, EmeraldPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = fallbackChar,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = EmeraldDark
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = member.namaLengkap,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "ID: ${member.id}",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
        }

        item {
            BiodataItemRow(label = "Kelompok Pengajian", value = member.kelompokPengajian)
            BiodataItemRow(label = "Dapuan", value = member.dapuan ?: "-")
            BiodataItemRow(label = "Jenis Kelamin", value = member.jenisKelamin)
            BiodataItemRow(
                label = "Tempat, Tanggal Lahir",
                value = "${member.tempatLahir ?: "-"}, ${DateUtils.formatDateIndo(member.tanggalLahir)}"
            )
            BiodataItemRow(label = "Usia", value = "$age Tahun")
            BiodataItemRow(label = "Kelompok Peramutan", value = peramutan)
            BiodataItemRow(label = "Status Hubungan Keluarga", value = member.statusHubunganKeluarga ?: "-")
            BiodataItemRow(label = "Nomor HP", value = member.nomorHp ?: "-")
            BiodataItemRow(label = "Pendidikan Terakhir", value = member.tingkatPendidikan ?: "-")
            BiodataItemRow(label = "Pekerjaan Utama", value = member.pekerjaanUtama ?: "-")
        }
    }
}

@Composable
fun BiodataItemRow(label: String, value: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(text = label, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(6.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 0.5.dp)
    }
}

@Composable
fun AttendanceGauge(percent: Int, modifier: Modifier = Modifier) {
    val animatedPercent by animateFloatAsState(
        targetValue = percent.toFloat(),
        animationSpec = tween(durationMillis = 1000)
    )

    Box(
        modifier = modifier.size(120.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = Color.LightGray.copy(alpha = 0.2f),
                style = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
            )
            drawArc(
                color = EmeraldPrimary,
                startAngle = -90f,
                sweepAngle = (animatedPercent / 100f) * 360f,
                useCenter = false,
                style = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${percent}%",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = EmeraldDark
            )
            Text(
                text = "Kehadiran",
                fontSize = 11.sp,
                color = TextMuted
            )
        }
    }
}

@Composable
fun FamilyKehadiranTab(state: FamilyDetailUiState.Success) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                AttendanceGauge(percent = state.attendancePercent)

                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EmeraldLight.copy(alpha = 0.5f)),
                    modifier = Modifier.width(160.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Status Pengajian Teks",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = EmeraldDark,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Bulan Ini",
                            fontSize = 10.sp,
                            color = EmeraldDark.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.statusTeks,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (state.statusTeks == "Sudah") ColorSuccess else ColorDanger
                        )
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCounterCard(
                    label = "Total Sesi",
                    count = state.totalSessions,
                    color = ColorInfo,
                    modifier = Modifier.weight(1f)
                )
                StatCounterCard(
                    label = "Hadir",
                    count = state.countHadir,
                    color = ColorSuccess,
                    modifier = Modifier.weight(1f)
                )
                StatCounterCard(
                    label = "Izin",
                    count = state.countIzin,
                    color = ColorWarning,
                    modifier = Modifier.weight(1f)
                )
                StatCounterCard(
                    label = "Alpha",
                    count = state.countAlpha,
                    color = ColorDanger,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Text(
                text = "Riwayat Kehadiran",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (state.attendanceList.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Belum ada riwayat pengajian yang diikuti.", color = TextMuted, fontSize = 13.sp)
                }
            }
        } else {
            items(state.attendanceList) { session ->
                FamilySessionAttendanceRow(session = session)
            }
        }
    }
}

@Composable
fun StatCounterCard(
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = label, fontSize = 10.sp, color = TextMuted, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = count.toString(), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = color)
        }
    }
}

@Composable
fun FamilySessionAttendanceRow(session: FamilySessionAttendanceItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = session.type,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${DateUtils.formatDateIndo(session.date)} • ${session.time} WIB",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }

            val statusText = session.status
            val (badgeBg, badgeTextClr) = when (statusText) {
                "Hadir Fisik", "Online" -> Pair(ColorSuccess.copy(alpha = 0.12f), ColorSuccess)
                "Izin" -> Pair(ColorWarning.copy(alpha = 0.12f), ColorWarning)
                else -> Pair(ColorDanger.copy(alpha = 0.12f), ColorDanger)
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(badgeBg)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = statusText,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = badgeTextClr
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyMemberEditDialog(
    member: Jamaah?, // null means add new member
    myProfile: Jamaah,
    repository: DataRepository,
    onDismiss: () -> Unit,
    onSave: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    var namaLengkap by remember { mutableStateOf(member?.namaLengkap ?: "") }
    var jenisKelamin by remember { mutableStateOf(member?.jenisKelamin ?: "Laki-laki") }
    var tempatLahir by remember { mutableStateOf(member?.tempatLahir ?: "") }
    var tanggalLahir by remember { mutableStateOf(member?.tanggalLahir ?: "") }
    var statusPernikahan by remember { mutableStateOf(member?.statusPernikahan ?: "Belum Menikah") }
    var statusHubunganKeluarga by remember { mutableStateOf(member?.statusHubunganKeluarga ?: "Anak") }
    var nomorHp by remember { mutableStateOf(member?.nomorHp ?: "") }
    var tingkatPendidikan by remember { mutableStateOf(member?.tingkatPendidikan ?: "SLTA/SMK") }
    var pekerjaanUtama by remember { mutableStateOf(member?.pekerjaanUtama ?: "Pelajar/Mahasiswa") }
    var fotoUrl by remember { mutableStateOf(member?.fotoUrl ?: "") }
    
    var isUploading by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    // Helper functions for photo upload
    fun uploadPhotoBytes(base64: String, extension: String) {
        val cleanName = namaLengkap.lowercase().replace(Regex("[^a-z0-9]"), "_")
        val fileName = "foto_${cleanName}_${System.currentTimeMillis()}.$extension"
        isUploading = true
        coroutineScope.launch {
            val url = repository.uploadPhoto(fileName, base64)
            isUploading = false
            if (url != null) {
                fotoUrl = url
                android.widget.Toast.makeText(context, "Foto profil berhasil diunggah!", android.widget.Toast.LENGTH_SHORT).show()
            } else {
                android.widget.Toast.makeText(context, "Gagal mengunggah foto profil.", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
        onResult = { uri ->
            if (uri != null) {
                val base64 = uriToBase64(context, uri)
                val ext = context.contentResolver.getType(uri)?.split("/")?.lastOrNull() ?: "jpg"
                if (base64 != null) {
                    uploadPhotoBytes(base64, ext)
                }
            }
        }
    )

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview(),
        onResult = { bitmap ->
            if (bitmap != null) {
                val base64 = bitmapToBase64(bitmap)
                uploadPhotoBytes(base64, "jpg")
            }
        }
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(
            usePlatformDefaultWidth = false
        ),
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.9f)
            .padding(16.dp),
        title = {
            Text(
                text = if (member == null) "Tambah Anggota Keluarga" else "Edit Biodata Anggota",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Profile photo row
                item {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                    ) {
                        if (fotoUrl.isNotEmpty()) {
                            AsyncImage(
                                model = fotoUrl,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(90.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, EmeraldPrimary, CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(90.dp)
                                    .background(EmeraldLight, CircleShape)
                                    .border(2.dp, EmeraldPrimary, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = if (namaLengkap.isNotEmpty()) namaLengkap.first().uppercase() else "?",
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldDark
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        if (isUploading) {
                            CircularProgressIndicator(color = EmeraldPrimary, modifier = Modifier.size(24.dp))
                            Text("Mengunggah foto...", fontSize = 12.sp, color = TextMuted)
                        } else {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { cameraLauncher.launch() },
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text("Ambil Kamera", fontSize = 11.sp, color = EmeraldDark)
                                }
                                OutlinedButton(
                                    onClick = { galleryLauncher.launch("image/*") },
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text("Pilih Galeri", fontSize = 11.sp, color = EmeraldDark)
                                }
                            }
                        }
                    }
                }

                // Name input
                item {
                    OutlinedTextField(
                        value = namaLengkap,
                        onValueChange = { namaLengkap = it },
                        label = { Text("Nama Lengkap") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    )
                }

                // Gender input
                item {
                    var expanded by remember { mutableStateOf(false) }
                    Column {
                        Text("Jenis Kelamin", fontSize = 11.sp, color = TextMuted)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(jenisKelamin, color = MaterialTheme.colorScheme.onSurface)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                DropdownMenuItem(text = { Text("Laki-laki") }, onClick = { jenisKelamin = "Laki-laki"; expanded = false })
                                DropdownMenuItem(text = { Text("Perempuan") }, onClick = { jenisKelamin = "Perempuan"; expanded = false })
                            }
                        }
                    }
                }

                // Birth metadata
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = tempatLahir,
                            onValueChange = { tempatLahir = it },
                            label = { Text("Tempat Lahir") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        OutlinedTextField(
                            value = tanggalLahir,
                            onValueChange = { tanggalLahir = it },
                            label = { Text("Tgl Lahir (YYYY-MM-DD)") },
                            placeholder = { Text("1995-12-30") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                // Marriage status
                item {
                    var expanded by remember { mutableStateOf(false) }
                    val options = listOf("Belum Menikah", "Menikah", "Duda", "Janda")
                    Column {
                        Text("Status Pernikahan", fontSize = 11.sp, color = TextMuted)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(statusPernikahan, color = MaterialTheme.colorScheme.onSurface)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                options.forEach { opt ->
                                    DropdownMenuItem(text = { Text(opt) }, onClick = { statusPernikahan = opt; expanded = false })
                                }
                            }
                        }
                    }
                }

                // Family relationship
                if (member?.statusHubunganKeluarga?.trim()?.lowercase() != "kepala keluarga") {
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        val options = listOf("Istri", "Anak", "Ayah", "Ibu", "Lainnya")
                        Column {
                            Text("Hubungan Keluarga", fontSize = 11.sp, color = TextMuted)
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(
                                    onClick = { expanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(statusHubunganKeluarga, color = MaterialTheme.colorScheme.onSurface)
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    options.forEach { opt ->
                                        DropdownMenuItem(text = { Text(opt) }, onClick = { statusHubunganKeluarga = opt; expanded = false })
                                    }
                                }
                            }
                        }
                    }
                }

                // HP
                item {
                    OutlinedTextField(
                        value = nomorHp,
                        onValueChange = { nomorHp = it },
                        label = { Text("Nomor HP") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    )
                }

                // Education
                item {
                    var expanded by remember { mutableStateOf(false) }
                    val options = listOf("SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3", "PAUD", "Lainnya")
                    Column {
                        Text("Pendidikan Terakhir", fontSize = 11.sp, color = TextMuted)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(tingkatPendidikan, color = MaterialTheme.colorScheme.onSurface)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                options.forEach { opt ->
                                    DropdownMenuItem(text = { Text(opt) }, onClick = { tingkatPendidikan = opt; expanded = false })
                                }
                            }
                        }
                    }
                }

                // Job
                item {
                    var expanded by remember { mutableStateOf(false) }
                    val options = listOf("Pelajar/Mahasiswa", "Swasta", "Wiraswasta", "PNS/TNI/Polri", "IRT", "Lainnya")
                    Column {
                        Text("Pekerjaan Utama", fontSize = 11.sp, color = TextMuted)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(pekerjaanUtama, color = MaterialTheme.colorScheme.onSurface)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                options.forEach { opt ->
                                    DropdownMenuItem(text = { Text(opt) }, onClick = { pekerjaanUtama = opt; expanded = false })
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (namaLengkap.trim().isEmpty()) {
                        android.widget.Toast.makeText(context, "Nama Lengkap wajib diisi!", android.widget.Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    
                    isSaving = true
                    coroutineScope.launch {
                        val finalId = if (member == null) repository.getNextJamaahId() else member.id
                        val kkId = if (myProfile.kepalaKeluargaId.isNullOrEmpty()) myProfile.id else myProfile.kepalaKeluargaId
                        
                        val payload = Jamaah(
                            id = finalId,
                            namaLengkap = namaLengkap.trim(),
                            kelompokPengajian = myProfile.kelompokPengajian,
                            jenisKelamin = jenisKelamin,
                            tempatLahir = tempatLahir.trim(),
                            tanggalLahir = if (tanggalLahir.trim().isEmpty()) null else tanggalLahir.trim(),
                            statusPernikahan = statusPernikahan,
                            statusHubunganKeluarga = if (member?.statusHubunganKeluarga?.trim()?.lowercase() == "kepala keluarga") "Kepala Keluarga" else statusHubunganKeluarga,
                            kepalaKeluargaId = if (member?.statusHubunganKeluarga?.trim()?.lowercase() == "kepala keluarga") null else kkId,
                            nomorHp = if (nomorHp.trim().isEmpty()) null else nomorHp.trim(),
                            tingkatPendidikan = tingkatPendidikan,
                            pekerjaanUtama = pekerjaanUtama,
                            dapuan = member?.dapuan ?: "Rokyah biasa",
                            statusEkonomi = member?.statusEkonomi ?: "Menengah",
                            kelancaranSambung = member?.kelancaranSambung ?: "Lancar",
                            fotoUrl = if (fotoUrl.trim().isEmpty()) null else fotoUrl.trim()
                        )
                        
                        val ok = repository.saveJamaah(payload)
                        isSaving = false
                        if (ok) {
                            android.widget.Toast.makeText(context, "Data berhasil disimpan!", android.widget.Toast.LENGTH_SHORT).show()
                            onSave()
                        } else {
                            android.widget.Toast.makeText(context, "Gagal menyimpan data ke database.", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(8.dp),
                enabled = !isUploading && !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Menyimpan...")
                } else {
                    Text("Simpan")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, colors = ButtonDefaults.textButtonColors(contentColor = TextMuted)) {
                Text("Batal")
            }
        }
    )
}

fun uriToBase64(context: android.content.Context, uri: Uri): String? {
    return try {
        val inputStream = context.contentResolver.openInputStream(uri)
        val bytes = inputStream?.readBytes()
        inputStream?.close()
        if (bytes != null) {
            Base64.encodeToString(bytes, Base64.NO_WRAP)
        } else {
            null
        }
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

fun bitmapToBase64(bitmap: Bitmap): String {
    val byteArrayOutputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream)
    val byteArray = byteArrayOutputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
}
