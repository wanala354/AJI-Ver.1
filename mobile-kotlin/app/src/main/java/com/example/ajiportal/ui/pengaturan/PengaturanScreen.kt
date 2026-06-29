package com.example.ajiportal.ui.pengaturan

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyItemScope
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.theme.*
import com.example.ajiportal.utils.BiometricHelper
import com.example.ajiportal.utils.HashUtils
import kotlinx.coroutines.launch
import androidx.compose.foundation.BorderStroke as BoxBorder


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PengaturanScreen(
    repository: DataRepository,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var oldPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isChangingPassword by remember { mutableStateOf(false) }

    var isBiometricsEnabled by remember { mutableStateOf(repository.sessionManager.isBiometricsEnabled()) }
    val isBiometricHardwareAvailable = remember { BiometricHelper.isBiometricAvailable(context) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Tab Title
        item {
            Text(
                text = "Pengaturan & Keamanan",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        // Biometrics Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fingerprint,
                            contentDescription = null,
                            tint = EmeraldPrimary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "Login Biometrik",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = if (isBiometricHardwareAvailable) "Gunakan sidik jari atau wajah Anda untuk login" else "Sensor biometrik tidak tersedia",
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                        }
                    }

                    Switch(
                        checked = isBiometricsEnabled,
                        onCheckedChange = { checked ->
                            if (!isBiometricHardwareAvailable) {
                                Toast.makeText(context, "Hardware biometrik tidak didukung di HP ini", Toast.LENGTH_SHORT).show()
                                return@Switch
                            }
                            repository.sessionManager.setBiometricsEnabled(checked)
                            isBiometricsEnabled = checked
                            Toast.makeText(context, if (checked) "Biometrik diaktifkan" else "Biometrik dimatikan", Toast.LENGTH_SHORT).show()
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = EmeraldPrimary
                        ),
                        enabled = isBiometricHardwareAvailable
                    )
                }
            }
        }

        // Change Password Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Ubah Kata Sandi",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    OutlinedTextField(
                        value = oldPassword,
                        onValueChange = { oldPassword = it },
                        label = { Text("Kata Sandi Lama") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldPrimary, focusedLabelColor = EmeraldPrimary),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it },
                        label = { Text("Kata Sandi Baru") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldPrimary, focusedLabelColor = EmeraldPrimary),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Konfirmasi Kata Sandi Baru") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldPrimary, focusedLabelColor = EmeraldPrimary),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    if (isChangingPassword) {
                        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = EmeraldPrimary)
                        }
                    } else {
                        Button(
                            onClick = {
                                if (oldPassword.isEmpty() || newPassword.isEmpty() || confirmPassword.isEmpty()) {
                                    Toast.makeText(context, "Semua kolom password wajib diisi", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                if (newPassword != confirmPassword) {
                                    Toast.makeText(context, "Password baru dan konfirmasi tidak cocok", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                
                                val savedHash = repository.sessionManager.getPasswordHash()
                                val oldHash = HashUtils.sha256(oldPassword)
                                
                                if (savedHash != oldHash) {
                                    Toast.makeText(context, "Password lama salah", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }

                                coroutineScope.launch {
                                    isChangingPassword = true
                                    val newHash = HashUtils.sha256(newPassword)
                                    val success = repository.updatePassword(newHash)
                                    isChangingPassword = false
                                    if (success) {
                                        Toast.makeText(context, "Password berhasil diubah", Toast.LENGTH_SHORT).show()
                                        oldPassword = ""
                                        newPassword = ""
                                        confirmPassword = ""
                                    } else {
                                        Toast.makeText(context, "Gagal mengubah password di server.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Simpan Password Baru", color = Color.White)
                        }
                    }
                }
            }
        }

        // Logout Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        repository.logout()
                        onLogout()
                    },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = ColorDanger.copy(alpha = 0.08f)),
                border = BoxBorder(1.dp, ColorDanger.copy(alpha = 0.2f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        tint = ColorDanger,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = "Keluar dari Akun",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorDanger
                    )
                }
            }
        }
    }
}

// Utility extension for list view in lazy columns
fun <T> LazyListScope.item(content: @Composable LazyItemScope.() -> Unit) {
    item(null, null, content)
}
