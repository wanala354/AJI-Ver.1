package com.example.ajiportal.ui.auth

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.HomeWork
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.theme.EmeraldDark
import com.example.ajiportal.theme.EmeraldPrimary
import com.example.ajiportal.utils.BiometricHelper
import com.example.ajiportal.utils.HashUtils
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    repository: DataRepository,
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var showBiometricOfferDialog by remember { mutableStateOf(false) }
    var showRegisterDialog by remember { mutableStateOf(false) }
    
    var allJamaah by remember { mutableStateOf<List<Jamaah>>(emptyList()) }
    var kelompokList by remember { mutableStateOf<List<String>>(emptyList()) }
    var isFetchingRegisterData by remember { mutableStateOf(false) }

    LaunchedEffect(showRegisterDialog) {
        if (showRegisterDialog) {
            isFetchingRegisterData = true
            try {
                allJamaah = repository.getAllJamaah()
                kelompokList = repository.getKelompokList()
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isFetchingRegisterData = false
            }
        }
    }

    // Check if biometric authentication can be performed
    val isBiometricAvail = remember { BiometricHelper.isBiometricAvailable(context) }
    val isBiometricEnabled = remember { repository.sessionManager.isBiometricsEnabled() }
    val savedUsername = remember { repository.sessionManager.getUsername() }
    val savedPasswordHash = remember { repository.sessionManager.getPasswordHash() }

    // Trigger biometric prompt automatically if enabled and credentials exist
    LaunchedEffect(Unit) {
        if (isBiometricAvail && isBiometricEnabled && !savedUsername.isNullOrEmpty() && !savedPasswordHash.isNullOrEmpty()) {
            val activity = context as? FragmentActivity
            if (activity != null) {
                BiometricHelper.showBiometricPrompt(
                    activity = activity,
                    onSuccess = {
                        coroutineScope.launch {
                            isLoading = true
                            val success = repository.login(savedUsername, savedPasswordHash)
                            isLoading = false
                            if (success) {
                                onLoginSuccess()
                            } else {
                                Toast.makeText(context, "Biometrik kadaluarsa, silakan ketik password.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    onError = { err ->
                        // Silently fallback to manual entry
                    }
                )
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(EmeraldPrimary, EmeraldDark)
                )
            )
    ) {
        // Main content card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.Center)
                .padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "AJI PORTAL",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = EmeraldDark
                )
                
                Text(
                    text = "Portal Digital Jamaah",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = EmeraldPrimary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldPrimary,
                        focusedLabelColor = EmeraldPrimary
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldPrimary) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = null,
                                tint = EmeraldPrimary
                            )
                        }
                    },
                    singleLine = true,
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldPrimary,
                        focusedLabelColor = EmeraldPrimary
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                if (isLoading) {
                    CircularProgressIndicator(color = EmeraldPrimary)
                } else {
                    Button(
                        onClick = {
                            if (username.isEmpty() || password.isEmpty()) {
                                Toast.makeText(context, "Harap isi semua kolom", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            coroutineScope.launch {
                                isLoading = true
                                val passHash = HashUtils.sha256(password)
                                val success = repository.login(username, passHash)
                                isLoading = false
                                if (success) {
                                    // If authentication succeeds and biometrics is available but not yet enabled, offer it
                                    if (isBiometricAvail && !isBiometricEnabled) {
                                        showBiometricOfferDialog = true
                                    } else {
                                        onLoginSuccess()
                                    }
                                } else {
                                    Toast.makeText(context, "Username / password salah atau akun ditolak.", Toast.LENGTH_LONG).show()
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Masuk",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    // Biometric alternative button
                    if (isBiometricAvail && isBiometricEnabled && !savedUsername.isNullOrEmpty() && !savedPasswordHash.isNullOrEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        IconButton(
                            onClick = {
                                val activity = context as? FragmentActivity
                                if (activity != null) {
                                    BiometricHelper.showBiometricPrompt(
                                        activity = activity,
                                        onSuccess = {
                                            coroutineScope.launch {
                                                isLoading = true
                                                val success = repository.login(savedUsername, savedPasswordHash)
                                                isLoading = false
                                                if (success) {
                                                    onLoginSuccess()
                                                } else {
                                                    Toast.makeText(context, "Biometrik gagal, silakan gunakan password.", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        },
                                        onError = { err ->
                                            Toast.makeText(context, err, Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                }
                            },
                            modifier = Modifier
                                .size(56.dp)
                                .background(
                                    color = EmeraldPrimary.copy(alpha = 0.1f),
                                    shape = RoundedCornerShape(28.dp)
                                )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Fingerprint,
                                contentDescription = "Biometric Login",
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "Belum punya akun? ",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontSize = 14.sp
                        )
                        TextButton(
                            onClick = { showRegisterDialog = true },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text(
                                text = "Registrasi",
                                color = EmeraldPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }

    // Biometric Offer Dialog
    if (showBiometricOfferDialog) {
        AlertDialog(
            onDismissRequest = {
                showBiometricOfferDialog = false
                onLoginSuccess()
            },
            title = { Text("Aktifkan Biometrik?") },
            text = { Text("Apakah Anda ingin mengaktifkan sensor sidik jari atau wajah untuk masuk berikutnya tanpa password?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        repository.sessionManager.setBiometricsEnabled(true)
                        showBiometricOfferDialog = false
                        Toast.makeText(context, "Biometrik diaktifkan.", Toast.LENGTH_SHORT).show()
                        onLoginSuccess()
                    }
                ) {
                    Text("Ya, Aktifkan", color = EmeraldPrimary)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showBiometricOfferDialog = false
                        onLoginSuccess()
                    }
                ) {
                    Text("Tidak Sekarang", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            }
        )
    }

    // Registration Dialog
    if (showRegisterDialog) {
        var regNamaSearch by remember { mutableStateOf("") }
        var regSelectedJamaahId by remember { mutableStateOf<String?>(null) }
        var regKelompok by remember { mutableStateOf("") }
        var regJk by remember { mutableStateOf("Laki-laki") }
        var regTglLahir by remember { mutableStateOf("") }
        var regHp by remember { mutableStateOf("") }
        var regPernikahan by remember { mutableStateOf("Belum Menikah") }
        var regUsername by remember { mutableStateOf("") }
        var regPassword by remember { mutableStateOf("") }
        var regPasswordConfirm by remember { mutableStateOf("") }
        
        var isSubmitting by remember { mutableStateOf(false) }
        var isDropdownExpanded by remember { mutableStateOf(false) }
        var isJkDropdownExpanded by remember { mutableStateOf(false) }
        var isKelompokDropdownExpanded by remember { mutableStateOf(false) }
        var isPernikahanDropdownExpanded by remember { mutableStateOf(false) }

        val filteredJamaah = remember(regNamaSearch, allJamaah) {
            if (regNamaSearch.length < 2) emptyList()
            else allJamaah.filter { it.namaLengkap.contains(regNamaSearch, ignoreCase = true) }
        }

        fun validateAndSubmit() {
            if (regNamaSearch.trim().isEmpty()) { Toast.makeText(context, "Nama Lengkap wajib diisi.", Toast.LENGTH_SHORT).show(); return }
            if (regKelompok.isEmpty()) { Toast.makeText(context, "Kelompok wajib dipilih.", Toast.LENGTH_SHORT).show(); return }
            if (regUsername.trim().isEmpty()) { Toast.makeText(context, "Username wajib diisi.", Toast.LENGTH_SHORT).show(); return }
            if (regPassword.length < 6) { Toast.makeText(context, "Password minimal 6 karakter.", Toast.LENGTH_SHORT).show(); return }
            if (regPassword != regPasswordConfirm) { Toast.makeText(context, "Konfirmasi password tidak cocok.", Toast.LENGTH_SHORT).show(); return }
            
            isSubmitting = true
            coroutineScope.launch {
                val passHash = HashUtils.sha256(regPassword)
                val success = if (regSelectedJamaahId != null) {
                    repository.registerLinkedUser(
                        username = regUsername.trim().lowercase(),
                        passwordHash = passHash,
                        jamaahId = regSelectedJamaahId!!,
                        kelompok = regKelompok
                    )
                } else {
                    repository.registerNewUser(
                        username = regUsername.trim().lowercase(),
                        passwordHash = passHash,
                        namaLengkap = regNamaSearch.trim(),
                        kelompok = regKelompok,
                        jenisKelamin = regJk,
                        tanggalLahir = regTglLahir.ifEmpty { null },
                        nomorHp = regHp.ifEmpty { null },
                        statusPernikahan = regPernikahan,
                        fotoUrl = null
                    )
                }
                isSubmitting = false
                if (success) {
                    Toast.makeText(context, "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari admin/operator kelompok $regKelompok.", Toast.LENGTH_LONG).show()
                    showRegisterDialog = false
                } else {
                    Toast.makeText(context, "Pendaftaran gagal. Username mungkin sudah digunakan.", Toast.LENGTH_LONG).show()
                }
            }
        }

        Dialog(
            onDismissRequest = { showRegisterDialog = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Header Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(EmeraldDark)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Pendaftaran Akun AJI",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        IconButton(onClick = { showRegisterDialog = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                        }
                    }

                    // Content form
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(20.dp)
                    ) {
                        // Green Mosque Dome Icon using Canvas
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Canvas(modifier = Modifier.size(64.dp)) {
                                    // Left Minaret
                                    drawRoundRect(
                                        color = Color(0xFF10B981),
                                        topLeft = Offset(4.dp.toPx(), 24.dp.toPx()),
                                        size = Size(6.dp.toPx(), 40.dp.toPx()),
                                        cornerRadius = CornerRadius(2.dp.toPx())
                                    )
                                    val leftPath = Path().apply {
                                        moveTo(4.dp.toPx(), 24.dp.toPx())
                                        lineTo(7.dp.toPx(), 14.dp.toPx())
                                        lineTo(10.dp.toPx(), 24.dp.toPx())
                                        close()
                                    }
                                    drawPath(leftPath, color = Color(0xFF10B981))

                                    // Right Minaret
                                    drawRoundRect(
                                        color = Color(0xFF10B981),
                                        topLeft = Offset(54.dp.toPx(), 24.dp.toPx()),
                                        size = Size(6.dp.toPx(), 40.dp.toPx()),
                                        cornerRadius = CornerRadius(2.dp.toPx())
                                    )
                                    val rightPath = Path().apply {
                                        moveTo(54.dp.toPx(), 24.dp.toPx())
                                        lineTo(57.dp.toPx(), 14.dp.toPx())
                                        lineTo(60.dp.toPx(), 24.dp.toPx())
                                        close()
                                    }
                                    drawPath(rightPath, color = Color(0xFF10B981))

                                    // Outer Dome Base
                                    drawRoundRect(
                                        color = Color(0xFF10B981),
                                        topLeft = Offset(14.dp.toPx(), 54.dp.toPx()),
                                        size = Size(36.dp.toPx(), 10.dp.toPx()),
                                        cornerRadius = CornerRadius(2.dp.toPx())
                                    )

                                    // Main Dome Path
                                    val domePath = Path().apply {
                                        moveTo(16.dp.toPx(), 54.dp.toPx())
                                        cubicTo(16.dp.toPx(), 20.dp.toPx(), 48.dp.toPx(), 20.dp.toPx(), 48.dp.toPx(), 54.dp.toPx())
                                        close()
                                    }
                                    drawPath(domePath, color = Color(0xFF10B981))

                                    // Star/Crescent Pole
                                    drawLine(
                                        color = Color(0xFF10B981),
                                        start = Offset(32.dp.toPx(), 26.dp.toPx()),
                                        end = Offset(32.dp.toPx(), 10.dp.toPx()),
                                        strokeWidth = 2.5.dp.toPx()
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "AJI PORTAL",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = EmeraldDark
                                )
                                Text(
                                    text = "Pendaftaran Akun",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                            }
                        }

                        // Warning banner
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7))
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Text(
                                    text = "Setelah mendaftar, akun Anda harus disetujui terlebih dahulu oleh operator/admin kelompok sebelum bisa digunakan untuk masuk.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF92400E)
                                )
                            }
                        }

                        if (isFetchingRegisterData) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = EmeraldPrimary)
                            }
                        } else {
                            // Form Input Nama Lengkap (Autocomplete)
                            Text(
                                text = "Pencarian Anggota Jamaah",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp)
                            ) {
                                OutlinedTextField(
                                    value = regNamaSearch,
                                    onValueChange = {
                                        regNamaSearch = it
                                        regSelectedJamaahId = null // Reset link if edited
                                        isDropdownExpanded = true
                                    },
                                    label = { Text("Nama Lengkap (Sesuai KTP)*") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldPrimary,
                                        focusedLabelColor = EmeraldPrimary
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                if (isDropdownExpanded && filteredJamaah.isNotEmpty()) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 64.dp)
                                            .heightIn(max = 200.dp),
                                        shape = RoundedCornerShape(12.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                    ) {
                                        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                                            filteredJamaah.forEach { jamaah ->
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable {
                                                            regNamaSearch = jamaah.namaLengkap
                                                            regSelectedJamaahId = jamaah.id
                                                            regKelompok = jamaah.kelompokPengajian
                                                            regJk = jamaah.jenisKelamin
                                                            regTglLahir = jamaah.tanggalLahir ?: ""
                                                            regHp = jamaah.nomorHp ?: ""
                                                            regPernikahan = jamaah.statusPernikahan ?: "Belum Menikah"
                                                            isDropdownExpanded = false
                                                        }
                                                        .padding(16.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column {
                                                        Text(text = jamaah.namaLengkap, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                                        Text(text = "Kelompok: ${jamaah.kelompokPengajian}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                                    }
                                                }
                                                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                                            }
                                        }
                                    }
                                }
                            }

                            // Form Input Kelompok
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp)
                            ) {
                                OutlinedTextField(
                                    value = regKelompok,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Kelompok Pengajian*") },
                                    trailingIcon = {
                                        IconButton(onClick = { isKelompokDropdownExpanded = true }) {
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = EmeraldPrimary)
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth().clickable { isKelompokDropdownExpanded = true },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldPrimary,
                                        focusedLabelColor = EmeraldPrimary
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                DropdownMenu(
                                    expanded = isKelompokDropdownExpanded,
                                    onDismissRequest = { isKelompokDropdownExpanded = false },
                                    modifier = Modifier.fillMaxWidth(0.85f)
                                ) {
                                    kelompokList.forEach { name ->
                                        DropdownMenuItem(
                                            text = { Text(name) },
                                            onClick = {
                                                regKelompok = name
                                                isKelompokDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Row for Gender and Date of Birth
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                // Jenis Kelamin (Dropdown)
                                Box(
                                    modifier = Modifier.weight(1f)
                                ) {
                                    OutlinedTextField(
                                        value = regJk,
                                        onValueChange = {},
                                        readOnly = true,
                                        label = { Text("Jenis Kelamin*") },
                                        trailingIcon = {
                                            IconButton(onClick = { isJkDropdownExpanded = true }) {
                                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = EmeraldPrimary)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().clickable { isJkDropdownExpanded = true },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldPrimary,
                                            focusedLabelColor = EmeraldPrimary
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    DropdownMenu(
                                        expanded = isJkDropdownExpanded,
                                        onDismissRequest = { isJkDropdownExpanded = false }
                                    ) {
                                        listOf("Laki-laki", "Perempuan").forEach { item ->
                                            DropdownMenuItem(
                                                text = { Text(item) },
                                                onClick = {
                                                    regJk = item
                                                    isJkDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Tanggal Lahir
                                OutlinedTextField(
                                    value = regTglLahir,
                                    onValueChange = { regTglLahir = it },
                                    label = { Text("Tgl Lahir (YYYY-MM-DD)") },
                                    placeholder = { Text("2000-01-31") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldPrimary,
                                        focusedLabelColor = EmeraldPrimary
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }

                            // Row for Phone and Marriage Status
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                // Nomor HP
                                OutlinedTextField(
                                    value = regHp,
                                    onValueChange = { regHp = it },
                                    label = { Text("Nomor HP") },
                                    placeholder = { Text("08123...") },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldPrimary,
                                        focusedLabelColor = EmeraldPrimary
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                // Status Pernikahan (Dropdown)
                                Box(
                                    modifier = Modifier.weight(1f)
                                ) {
                                    OutlinedTextField(
                                        value = regPernikahan,
                                        onValueChange = {},
                                        readOnly = true,
                                        label = { Text("Pernikahan") },
                                        trailingIcon = {
                                            IconButton(onClick = { isPernikahanDropdownExpanded = true }) {
                                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = EmeraldPrimary)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().clickable { isPernikahanDropdownExpanded = true },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldPrimary,
                                            focusedLabelColor = EmeraldPrimary
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    DropdownMenu(
                                        expanded = isPernikahanDropdownExpanded,
                                        onDismissRequest = { isPernikahanDropdownExpanded = false }
                                    ) {
                                        listOf("Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati").forEach { item ->
                                            DropdownMenuItem(
                                                text = { Text(item) },
                                                onClick = {
                                                    regPernikahan = item
                                                    isPernikahanDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            HorizontalDivider(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                                modifier = Modifier.padding(vertical = 12.dp)
                            )

                            // Username
                            OutlinedTextField(
                                value = regUsername,
                                onValueChange = { regUsername = it },
                                label = { Text("Username login baru*") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldPrimary,
                                    focusedLabelColor = EmeraldPrimary
                                ),
                                shape = RoundedCornerShape(12.dp)
                            )

                            // Password
                            OutlinedTextField(
                                value = regPassword,
                                onValueChange = { regPassword = it },
                                label = { Text("Password*") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldPrimary,
                                    focusedLabelColor = EmeraldPrimary
                                ),
                                shape = RoundedCornerShape(12.dp)
                            )

                            // Confirm Password
                            OutlinedTextField(
                                value = regPasswordConfirm,
                                onValueChange = { regPasswordConfirm = it },
                                label = { Text("Konfirmasi Password*") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 24.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldPrimary,
                                    focusedLabelColor = EmeraldPrimary
                                ),
                                shape = RoundedCornerShape(12.dp)
                            )

                            // Submit Button
                            if (isSubmitting) {
                                Box(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = EmeraldPrimary)
                                }
                            } else {
                                Button(
                                    onClick = { validateAndSubmit() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(50.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = "Kirim Pendaftaran",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
