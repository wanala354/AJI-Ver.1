package com.example.ajiportal.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.theme.EmeraldPrimary
import com.example.ajiportal.ui.dashboard.DashboardScreen
import com.example.ajiportal.ui.jadwal.JadwalScreen
import com.example.ajiportal.ui.keluarga.KeluargaScreen
import com.example.ajiportal.ui.pengaturan.PengaturanScreen
import com.example.ajiportal.utils.ScannerHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    repository: DataRepository,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(0) }
    var refreshTrigger by remember { mutableStateOf(0) }
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = when (selectedTab) {
                            0 -> "Dashboard Jamaah"
                            1 -> "Jadwal & Absensi"
                            2 -> "Keluarga Saya"
                            else -> "Pengaturan"
                        },
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = EmeraldPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Dashboard") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = EmeraldPrimary,
                        selectedTextColor = EmeraldPrimary,
                        indicatorColor = EmeraldPrimary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                    label = { Text("Jadwal") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = EmeraldPrimary,
                        selectedTextColor = EmeraldPrimary,
                        indicatorColor = EmeraldPrimary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Keluarga") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = EmeraldPrimary,
                        selectedTextColor = EmeraldPrimary,
                        indicatorColor = EmeraldPrimary.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Pengaturan") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = EmeraldPrimary,
                        selectedTextColor = EmeraldPrimary,
                        indicatorColor = EmeraldPrimary.copy(alpha = 0.1f)
                    )
                )
            }
        },
        floatingActionButton = {
            if (selectedTab == 0 || selectedTab == 1) {
                FloatingActionButton(
                    onClick = {
                        ScannerHelper.startQRScanner(
                            context = context,
                            repository = repository,
                            coroutineScope = coroutineScope,
                            onSuccess = {
                                refreshTrigger++
                            }
                        )
                    },
                    containerColor = EmeraldPrimary,
                    contentColor = Color.White
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = "Scan QR Code",
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    ) { paddingValues ->
        val screenModifier = Modifier.padding(paddingValues)
        
        key(selectedTab, refreshTrigger) {
            when (selectedTab) {
                0 -> DashboardScreen(repository = repository, modifier = screenModifier)
                1 -> JadwalScreen(repository = repository, modifier = screenModifier)
                2 -> KeluargaScreen(repository = repository, modifier = screenModifier)
                3 -> PengaturanScreen(repository = repository, onLogout = onLogout, modifier = screenModifier)
            }
        }
    }
}
