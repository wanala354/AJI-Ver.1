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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.HomeWork
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.border
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.data.model.Jamaah
import com.example.ajiportal.data.model.User
import com.example.ajiportal.data.model.RegisterResult
import com.example.ajiportal.theme.EmeraldDark
import com.example.ajiportal.theme.EmeraldPrimary
import com.example.ajiportal.theme.TextMuted
import com.example.ajiportal.theme.CreamLight
import com.example.ajiportal.theme.CreamDark
import com.example.ajiportal.theme.NavyBlue
import com.example.ajiportal.theme.IslamicGoldDark
import com.example.ajiportal.theme.IslamicGold
import androidx.compose.ui.draw.rotate
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
    var registeredUsersMap by remember { mutableStateOf<Map<String, User>>(emptyMap()) }
    var isFetchingRegisterData by remember { mutableStateOf(false) }

    LaunchedEffect(showRegisterDialog) {
        if (showRegisterDialog) {
            isFetchingRegisterData = true
            try {
                allJamaah = repository.getAllJamaah()
                kelompokList = repository.getKelompokList()
                val users = repository.getRegisteredUsers()
                registeredUsersMap = users.filter { !it.jamaahId.isNullOrBlank() }.associateBy { it.jamaahId!! }
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
                    colors = listOf(CreamLight, CreamDark)
                )
            )
    ) {
        // Watermark ornamen islami di pojok-pojok
        com.example.ajiportal.ui.components.IslamicCornerOrnament(
            modifier = Modifier
                .align(Alignment.TopStart)
                .size(160.dp),
            color = IslamicGold.copy(alpha = 0.12f)
        )
        com.example.ajiportal.ui.components.IslamicCornerOrnament(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .size(160.dp)
                .rotate(180f),
            color = IslamicGold.copy(alpha = 0.12f)
        )

        // Medali Islami besar di tengah sebagai latar belakang samar
        com.example.ajiportal.ui.components.IslamicMedallion(
            modifier = Modifier
                .align(Alignment.Center)
                .size(340.dp),
            color = IslamicGold.copy(alpha = 0.04f)
        )

        // Main content column centered vertically
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = com.example.ajiportal.R.drawable.app_logo),
                contentDescription = "Logo AJI",
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .border(1.2.dp, IslamicGold.copy(alpha = 0.5f), RoundedCornerShape(28.dp))
                    .padding(bottom = 12.dp)
            )

            // Input card with glassmorphism styling
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.88f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(24.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Selamat Datang",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    
                    Text(
                        text = "Silakan masuk ke akun Anda",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.padding(bottom = 20.dp)
                    )

                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = IslamicGold) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = IslamicGold,
                            focusedLabelColor = IslamicGold,
                            cursorColor = IslamicGold
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = IslamicGold) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = null,
                                    tint = IslamicGold
                                )
                            }
                        },
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = IslamicGold,
                            focusedLabelColor = IslamicGold,
                            cursorColor = IslamicGold
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    if (isLoading) {
                        CircularProgressIndicator(color = IslamicGold)
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
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = "Masuk",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
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
        var registeredUserAlert by remember { mutableStateOf<Pair<Jamaah, User>?>(null) }

        val filteredJamaah = remember(regNamaSearch, allJamaah) {
            val query = regNamaSearch.trim()
            if (query.length < 2) emptyList()
            else allJamaah.filter { it.namaLengkap.contains(query, ignoreCase = true) }
        }

        fun validateAndSubmit() {
            if (regSelectedJamaahId == null) {
                Toast.makeText(context, "Silakan cari dan pilih nama jamaah Anda dari database terlebih dahulu.", Toast.LENGTH_LONG).show()
                return
            }
            if (regUsername.trim().isEmpty()) { 
                Toast.makeText(context, "Username wajib diisi.", Toast.LENGTH_SHORT).show()
                return 
            }
            if (regPassword.length < 6) { 
                Toast.makeText(context, "Password minimal 6 karakter.", Toast.LENGTH_SHORT).show()
                return 
            }
            if (regPassword != regPasswordConfirm) { 
                Toast.makeText(context, "Konfirmasi password tidak cocok.", Toast.LENGTH_SHORT).show()
                return 
            }
            
            isSubmitting = true
            coroutineScope.launch {
                val passHash = HashUtils.sha256(regPassword)
                val result = repository.registerLinkedUser(
                    username = regUsername.trim().lowercase(),
                    passwordHash = passHash,
                    jamaahId = regSelectedJamaahId!!,
                    kelompok = regKelompok
                )
                isSubmitting = false
                when (result) {
                    is RegisterResult.Success -> {
                        Toast.makeText(context, "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari operator kelompok $regKelompok.", Toast.LENGTH_LONG).show()
                        showRegisterDialog = false
                    }
                    is RegisterResult.UsernameTaken -> {
                        Toast.makeText(context, "Username \"$regUsername\" sudah digunakan oleh akun lain. Silakan gunakan username lain.", Toast.LENGTH_LONG).show()
                    }
                    is RegisterResult.JamaahAlreadyRegistered -> {
                        Toast.makeText(context, "Jamaah ini sudah memiliki akun terdaftar dengan username \"${result.username}\".", Toast.LENGTH_LONG).show()
                    }
                    is RegisterResult.Error -> {
                        Toast.makeText(context, "Pendaftaran gagal: ${result.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        // Dialog peringatan jika jamaah sudah terdaftar
        if (registeredUserAlert != null) {
            val (alertJamaah, alertUser) = registeredUserAlert!!
            AlertDialog(
                onDismissRequest = { registeredUserAlert = null },
                icon = {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFFD97706),
                        modifier = Modifier.size(36.dp)
                    )
                },
                title = {
                    Text(
                        text = "Jamaah Sudah Terdaftar",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                text = {
                    Column {
                        Text(
                            text = "Jamaah atas nama \"${alertJamaah.namaLengkap}\" (${alertJamaah.kelompokPengajian}) sudah memiliki akun pengguna di sistem dengan:",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEF3C7), RoundedCornerShape(8.dp))
                                .padding(10.dp)
                        ) {
                            Column {
                                Text(
                                    text = "Username: ${alertUser.username}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color(0xFF92400E)
                                )
                                Text(
                                    text = "Status: ${alertUser.status.uppercase()}",
                                    fontSize = 12.sp,
                                    color = Color(0xFFB45309)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Silakan langsung masuk menggunakan akun tersebut. Jika Anda lupa kata sandi, silakan hubungi operator kelompok.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            username = alertUser.username
                            registeredUserAlert = null
                            showRegisterDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                    ) {
                        Text("Ke Halaman Login", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { registeredUserAlert = null }) {
                        Text("Tutup", color = TextMuted)
                    }
                }
            )
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
                                    text = "Pendaftaran Akun Jamaah",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                            }
                        }

                        // Info banner: registrasi khusus jamaah terdaftar
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7))
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Text(
                                    text = "Pendaftaran akun ini khusus untuk jamaah yang sudah terdaftar di database. Setelah mendaftar, akun menunggu persetujuan operator kelompok.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF92400E),
                                    lineHeight = 16.sp
                                )
                            }
                        }

                        if (isFetchingRegisterData) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressIndicator(color = EmeraldPrimary)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("Memuat data jamaah...", fontSize = 12.sp, color = TextMuted)
                                }
                            }
                        } else {
                            // Section: Pencarian Anggota Jamaah
                            Text(
                                text = "Cari Nama Anda di Database",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp)
                            ) {
                                OutlinedTextField(
                                    value = regNamaSearch,
                                    onValueChange = {
                                        if (regSelectedJamaahId == null) {
                                            regNamaSearch = it
                                            isDropdownExpanded = true
                                        }
                                    },
                                    readOnly = regSelectedJamaahId != null,
                                    label = { Text("Nama Lengkap (Sesuai KTP)*") },
                                    placeholder = { Text("Ketik nama Anda...") },
                                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = EmeraldPrimary) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    trailingIcon = {
                                        if (regSelectedJamaahId != null) {
                                            IconButton(onClick = {
                                                regSelectedJamaahId = null
                                                regNamaSearch = ""
                                                regKelompok = ""
                                                regJk = ""
                                                regTglLahir = ""
                                                regHp = ""
                                                regPernikahan = "Belum Menikah"
                                            }) {
                                                Icon(
                                                    imageVector = Icons.Default.Close,
                                                    contentDescription = "Ganti Jamaah",
                                                    tint = Color.Red
                                                )
                                            }
                                        }
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldPrimary,
                                        focusedLabelColor = EmeraldPrimary
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                )

                                // Dropdown hasil pencarian
                                if (isDropdownExpanded && filteredJamaah.isNotEmpty() && regSelectedJamaahId == null) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 64.dp)
                                            .heightIn(max = 240.dp),
                                        shape = RoundedCornerShape(12.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                    ) {
                                        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                                            filteredJamaah.forEach { jamaah ->
                                                val existingUser = registeredUsersMap[jamaah.id]
                                                val isAlreadyRegistered = existingUser != null
                                                
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable {
                                                            if (existingUser != null) {
                                                                registeredUserAlert = Pair(jamaah, existingUser)
                                                            } else {
                                                                regNamaSearch = jamaah.namaLengkap
                                                                regSelectedJamaahId = jamaah.id
                                                                regKelompok = jamaah.kelompokPengajian
                                                                regJk = jamaah.jenisKelamin
                                                                regTglLahir = jamaah.tanggalLahir ?: ""
                                                                regHp = jamaah.nomorHp ?: ""
                                                                regPernikahan = jamaah.statusPernikahan ?: "Belum Menikah"
                                                                isDropdownExpanded = false
                                                            }
                                                        }
                                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(
                                                            text = jamaah.namaLengkap,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp,
                                                            color = MaterialTheme.colorScheme.onSurface
                                                        )
                                                        Text(
                                                            text = "Kelompok: ${jamaah.kelompokPengajian} • ${jamaah.jenisKelamin}",
                                                            fontSize = 11.sp,
                                                            color = TextMuted
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    if (isAlreadyRegistered) {
                                                        Box(
                                                            modifier = Modifier
                                                                .background(Color(0xFFFEF3C7), RoundedCornerShape(8.dp))
                                                                .border(1.dp, Color(0xFFF59E0B), RoundedCornerShape(8.dp))
                                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                                        ) {
                                                            Text(
                                                                text = "Sudah Terdaftar",
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = Color(0xFFB45309)
                                                            )
                                                        }
                                                    } else {
                                                        Box(
                                                            modifier = Modifier
                                                                .background(EmeraldPrimary.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                                                                .border(1.dp, EmeraldPrimary.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                                        ) {
                                                            Text(
                                                                text = "Tersedia",
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = EmeraldDark
                                                            )
                                                        }
                                                    }
                                                }
                                                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                                            }
                                        }
                                    }
                                }
                            }

                            // Notifikasi jika nama tidak ditemukan di database
                            if (regNamaSearch.trim().length >= 2 && filteredJamaah.isEmpty() && regSelectedJamaahId == null) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)),
                                    border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Cancel,
                                            contentDescription = null,
                                            tint = Color(0xFFDC2626),
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = "Nama jamaah tidak tersedia di database sehingga registrasi tidak dapat dilakukan. Silakan hubungi operator kelompok untuk didaftarkan terlebih dahulu.",
                                            fontSize = 12.sp,
                                            color = Color(0xFF991B1B),
                                            lineHeight = 16.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }

                            // Petunjuk jika belum mencari nama
                            if (regSelectedJamaahId == null && regNamaSearch.trim().length < 2) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Info,
                                            contentDescription = null,
                                            tint = EmeraldPrimary,
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = "Ketik minimal 2 huruf nama lengkap Anda untuk mencari data di database jamaah.",
                                            fontSize = 12.sp,
                                            color = TextMuted,
                                            lineHeight = 16.sp
                                        )
                                    }
                                }
                            }

                            // Info Biodata Terverifikasi jika jamaah sudah dipilih
                            if (regSelectedJamaahId != null) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFD1FAE5)),
                                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.5f))
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = Color(0xFF047857),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Data Terverifikasi dari Database Jamaah",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                color = Color(0xFF065F46)
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "Nama: $regNamaSearch\nKelompok: $regKelompok • $regJk\nStatus: $regPernikahan${if (regTglLahir.isNotBlank()) " • Lahir: $regTglLahir" else ""}",
                                            fontSize = 11.sp,
                                            color = Color(0xFF065F46),
                                            lineHeight = 16.sp
                                        )
                                    }
                                }

                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )

                                Text(
                                    text = "Buat Akun Login",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldDark,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )

                                // Username
                                OutlinedTextField(
                                    value = regUsername,
                                    onValueChange = { regUsername = it.replace(" ", "") },
                                    label = { Text("Username Login Baru*") },
                                    placeholder = { Text("cth: ahmad.fauzi") },
                                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = EmeraldPrimary) },
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 14.dp),
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
                                    label = { Text("Password (minimal 6 karakter)*") },
                                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldPrimary) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    visualTransformation = PasswordVisualTransformation(),
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 14.dp),
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
                                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldPrimary) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    visualTransformation = PasswordVisualTransformation(),
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 20.dp),
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
                                            text = "Kirim Pendaftaran Akun",
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
}
