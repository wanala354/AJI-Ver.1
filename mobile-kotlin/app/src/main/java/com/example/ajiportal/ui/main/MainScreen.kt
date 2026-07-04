package com.example.ajiportal.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ajiportal.data.DataRepository
import com.example.ajiportal.theme.*
import kotlinx.coroutines.launch
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

    LaunchedEffect(Unit) {
        val username = repository.sessionManager.getUsername()
        if (username != null) {
            try {
                com.google.firebase.messaging.FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        coroutineScope.launch {
                            repository.saveDeviceToken(username, token)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    Scaffold(
        topBar = {
            Column {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary)
                ) {
                    // Islamic Pattern Canvas Overlay
                    Canvas(modifier = Modifier.matchParentSize()) {
                        val w = size.width
                        val h = size.height
                        val patternColor = Color.White.copy(alpha = 0.08f)
                        val goldPatternColor = IslamicGold.copy(alpha = 0.06f)
                        
                        // Draw diagonal star grid or intersecting lines
                        val stepX = 40.dp.toPx()
                        val stepY = 40.dp.toPx()
                        
                        var x = 0f
                        while (x < w) {
                            var y = 0f
                            while (y < h) {
                                // Intersecting diagonal lines
                                drawLine(
                                    color = patternColor,
                                    start = Offset(x, y),
                                    end = Offset(x + stepX, y + stepY),
                                    strokeWidth = 0.8.dp.toPx()
                                )
                                drawLine(
                                    color = patternColor,
                                    start = Offset(x + stepX, y),
                                    end = Offset(x, y + stepY),
                                    strokeWidth = 0.8.dp.toPx()
                                )
                                
                                // Star intersections
                                drawCircle(
                                    color = goldPatternColor,
                                    radius = 2.5.dp.toPx(),
                                    center = Offset(x + stepX/2, y + stepY/2)
                                )
                                
                                y += stepY
                            }
                            x += stepX
                        }
                        
                        // Elegant arch shape line at bottom of header
                        val archPath = Path().apply {
                            moveTo(0f, h)
                            cubicTo(w * 0.25f, h * 0.95f, w * 0.25f, h * 0.92f, w * 0.5f, h * 0.92f)
                            cubicTo(w * 0.75f, h * 0.92f, w * 0.75f, h * 0.95f, w, h)
                        }
                        drawPath(
                            path = archPath,
                            color = IslamicGold.copy(alpha = 0.15f),
                            style = Stroke(width = 1.2.dp.toPx())
                        )
                    }

                    CenterAlignedTopAppBar(
                        title = {
                            Text(
                                text = when (selectedTab) {
                                    0 -> "Dashboard Jamaah"
                                    1 -> "Jadwal Pengajian"
                                    2 -> "Presensi Pengajian"
                                    3 -> "Keluarga Saya"
                                    else -> "Pengaturan"
                                },
                                color = Color.White,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        },
                        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                            containerColor = Color.Transparent
                        )
                    )
                }
                HorizontalDivider(
                    thickness = 1.2.dp,
                    color = IslamicGold
                )
            }
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
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                    label = { Text("Jadwal") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Assignment, contentDescription = null) },
                    label = { Text("Absensi") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Keluarga") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Pengaturan") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
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
                    containerColor = MaterialTheme.colorScheme.primary,
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
                2 -> com.example.ajiportal.ui.absensi.AbsensiScreen(repository = repository, modifier = screenModifier)
                3 -> KeluargaScreen(repository = repository, modifier = screenModifier)
                4 -> PengaturanScreen(repository = repository, onLogout = onLogout, modifier = screenModifier)
            }
        }
    }
}
