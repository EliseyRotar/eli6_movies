package com.eli6movies.app.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LiveTv
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Theaters
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eli6movies.app.R
import com.eli6movies.app.analytics.Beacon
import com.eli6movies.app.ui.screens.browse.BrowseScreen
import com.eli6movies.app.ui.screens.home.HomeScreen
import com.eli6movies.app.ui.screens.live.LiveScreen
import com.eli6movies.app.ui.screens.mylist.MyListScreen
import com.eli6movies.app.ui.screens.profile.ProfileScreen
import androidx.compose.runtime.LaunchedEffect

sealed class Tab(val route: String, val labelRes: Int, val icon: @Composable () -> Unit) {
    data object Home    : Tab("home",    R.string.nav_home,    { Icon(Icons.Outlined.Home,     null) })
    data object Browse  : Tab("browse",  R.string.nav_browse,  { Icon(Icons.Outlined.Theaters, null) })
    data object Live    : Tab("live",    R.string.nav_live,    { Icon(Icons.Outlined.LiveTv,   null) })
    data object MyList  : Tab("mylist",  R.string.nav_mylist,  { Icon(Icons.Outlined.Bookmark, null) })
    data object Profile : Tab("profile", R.string.nav_profile, { Icon(Icons.Outlined.Person,   null) })
}

private val tabs = listOf(Tab.Home, Tab.Browse, Tab.Live, Tab.MyList, Tab.Profile)

@Composable
fun AppRoot() {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    LaunchedEffect(currentRoute) {
        if (currentRoute != null) Beacon.trackPath("/" + currentRoute)
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
            ) {
                tabs.forEach { tab ->
                    val selected = backStack?.destination?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            nav.navigate(tab.route) {
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = tab.icon,
                        label = { Text(stringResource(tab.labelRes)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor   = MaterialTheme.colorScheme.primary,
                            selectedTextColor   = MaterialTheme.colorScheme.primary,
                            indicatorColor      = MaterialTheme.colorScheme.surfaceVariant,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    )
                }
            }
        },
    ) { padding: PaddingValues ->
        NavHost(
            navController = nav,
            startDestination = Tab.Home.route,
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            composable(Tab.Home.route)    { HomeScreen() }
            composable(Tab.Browse.route)  { BrowseScreen() }
            composable(Tab.Live.route)    { LiveScreen() }
            composable(Tab.MyList.route)  { MyListScreen() }
            composable(Tab.Profile.route) { ProfileScreen() }
        }
    }
}
