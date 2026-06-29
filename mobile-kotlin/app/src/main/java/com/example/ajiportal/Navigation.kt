package com.example.ajiportal

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.ajiportal.data.DefaultDataRepository
import com.example.ajiportal.ui.auth.LoginScreen
import com.example.ajiportal.ui.main.MainScreen

@Composable
fun MainNavigation() {
  val context = LocalContext.current
  val repository = remember { DefaultDataRepository(context) }
  
  val startDestination = remember {
    if (repository.sessionManager.isLoggedIn()) MainKey else LoginKey
  }
  
  val backStack = rememberNavBackStack(startDestination)

  NavDisplay(
    backStack = backStack,
    onBack = { 
      if (backStack.lastOrNull() != MainKey && backStack.size > 1) {
        backStack.removeLastOrNull()
      }
    },
    entryProvider =
      entryProvider {
        entry<LoginKey> {
          LoginScreen(
            repository = repository,
            onLoginSuccess = {
              backStack.add(MainKey)
            },
            modifier = Modifier.fillMaxSize()
          )
        }
        entry<MainKey> {
          MainScreen(
            repository = repository,
            onLogout = {
              backStack.add(LoginKey)
            },
            modifier = Modifier.fillMaxSize()
          )
        }
      },
  )
}
