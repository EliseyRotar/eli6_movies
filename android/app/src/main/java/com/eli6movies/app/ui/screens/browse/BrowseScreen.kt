package com.eli6movies.app.ui.screens.browse

import android.content.Intent
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.data.repo.CatalogRepository
import com.eli6movies.app.player.PlayerActivity
import com.eli6movies.app.ui.components.PosterCard

private enum class Filter(val label: String, val typeParam: String) {
    Movies("Movies", "movie"),
    Tv("TV", "tv"),
    Anime("Anime", "anime"),
}

@Composable
fun BrowseScreen() {
    var filter by remember { mutableStateOf(Filter.Movies) }
    var items by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val ctx = LocalContext.current

    LaunchedEffect(filter) {
        loading = true
        items = when (filter) {
            Filter.Movies -> CatalogRepository.popularMovies()
            Filter.Tv    -> CatalogRepository.popularTv()
            Filter.Anime -> CatalogRepository.topAnime()
        }
        loading = false
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Filter.values().forEach { f ->
                FilterChip(
                    selected = filter == f,
                    onClick = { filter = f },
                    label = { Text(f.label) },
                )
            }
        }
        if (loading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        } else if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text("Nothing to show.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(16.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(items) { item ->
                    PosterCard(item) {
                        ctx.startActivity(
                            Intent(ctx, PlayerActivity::class.java).apply {
                                putExtra(PlayerActivity.EXTRA_TYPE, filter.typeParam)
                                putExtra(PlayerActivity.EXTRA_ID, item.id.toString())
                            },
                        )
                    }
                }
            }
        }
    }
}
