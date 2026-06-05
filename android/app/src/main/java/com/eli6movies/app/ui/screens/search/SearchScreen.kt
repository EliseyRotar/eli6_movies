package com.eli6movies.app.ui.screens.search

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.data.repo.CatalogRepository
import com.eli6movies.app.player.PlayerActivity
import com.eli6movies.app.ui.components.PosterCard
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged

private val BG = Color(0xFF0A0A0E)
private val SURFACE = Color(0xFF15151E)
private val FG_HI = Color(0xFFEAEAF8)
private val FG_MUTE = Color(0xFF9999B5)
private val FG_DIM = Color(0xFF55556A)
private val BRAND = Color(0xFFE5FF00)

@OptIn(ExperimentalComposeUiApi::class, FlowPreview::class)
@Composable
fun SearchScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val keyboard = LocalSoftwareKeyboardController.current
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var searched by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    LaunchedEffect(Unit) {
        snapshotFlow { query }
            .debounce(300)
            .distinctUntilChanged()
            .collect { q ->
                val trimmed = q.trim()
                if (trimmed.length < 2) {
                    results = emptyList()
                    searched = false
                    return@collect
                }
                loading = true
                results = CatalogRepository.search(trimmed)
                loading = false
                searched = true
            }
    }

    fun openPlayer(item: CatalogItem) {
        keyboard?.hide()
        ctx.startActivity(
            Intent(ctx, PlayerActivity::class.java).apply {
                putExtra(PlayerActivity.EXTRA_TYPE, item.kind)
                putExtra(PlayerActivity.EXTRA_ID, item.id.toString())
            },
        )
    }

    Column(Modifier.fillMaxSize().background(BG)) {
        // Top bar
        Row(
            Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .clickable { onBack() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = FG_HI)
            }
            Box(
                Modifier
                    .weight(1f)
                    .padding(horizontal = 4.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(SURFACE)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Search,
                        contentDescription = null,
                        tint = FG_MUTE,
                        modifier = Modifier.size(18.dp),
                    )
                    Box(Modifier.weight(1f).padding(start = 10.dp)) {
                        if (query.isEmpty()) {
                            Text(
                                "Search movies, shows, anime",
                                color = FG_DIM,
                                fontSize = 14.sp,
                            )
                        }
                        BasicTextField(
                            value = query,
                            onValueChange = { query = it },
                            singleLine = true,
                            cursorBrush = SolidColor(BRAND),
                            textStyle = TextStyle(
                                color = FG_HI,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                        )
                    }
                    if (query.isNotEmpty()) {
                        Box(
                            Modifier
                                .size(20.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White.copy(alpha = 0.1f))
                                .clickable { query = "" },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Outlined.Close,
                                contentDescription = "Clear",
                                tint = FG_MUTE,
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                }
            }
        }

        // Body
        Box(Modifier.fillMaxSize()) {
            when {
                loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = BRAND)
                }
                query.trim().length < 2 -> SearchPlaceholder()
                searched && results.isEmpty() -> NoResults(query.trim())
                else -> ResultsGrid(results, ::openPlayer)
            }
        }
    }
}

@Composable
private fun ResultsGrid(items: List<CatalogItem>, onClick: (CatalogItem) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(16.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(items) { PosterCard(it) { onClick(it) } }
    }
}

@Composable
private fun SearchPlaceholder() {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        Icon(
            Icons.Outlined.Search,
            contentDescription = null,
            tint = FG_DIM,
            modifier = Modifier.size(48.dp),
        )
        Text("Find your next watch", color = FG_HI, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Type at least 2 characters to search the catalogue.",
            color = FG_MUTE,
            fontSize = 13.sp,
        )
    }
}

@Composable
private fun NoResults(q: String) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
    ) {
        Text("No results for \"$q\"", color = FG_HI, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        Text("Try a shorter or different keyword.", color = FG_MUTE, fontSize = 13.sp)
    }
}
