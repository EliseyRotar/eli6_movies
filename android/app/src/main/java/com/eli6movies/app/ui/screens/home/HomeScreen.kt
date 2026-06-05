package com.eli6movies.app.ui.screens.home

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.eli6movies.app.R
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.data.repo.CatalogRepository
import com.eli6movies.app.player.PlayerActivity
import com.eli6movies.app.ui.components.CatalogRow
import com.eli6movies.app.util.PosterUrl

@Composable
fun HomeScreen() {
    var trending      by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var popularMovies by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var popularTv     by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var anime         by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var keepWatching  by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var loading       by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        trending      = CatalogRepository.trending()
        popularMovies = CatalogRepository.popularMovies()
        popularTv     = CatalogRepository.popularTv()
        anime         = CatalogRepository.topAnime()
        keepWatching  = CatalogRepository.keepWatching()
        loading = false
    }

    if (loading) {
        Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Hero(trending.firstOrNull())
        if (keepWatching.isNotEmpty()) CatalogRow(stringResource(R.string.row_continue_watching), keepWatching)
        CatalogRow(stringResource(R.string.row_trending), trending)
        CatalogRow(stringResource(R.string.row_popular_movies), popularMovies)
        CatalogRow(stringResource(R.string.row_popular_tv), popularTv)
        CatalogRow(stringResource(R.string.row_popular_anime), anime)
        Box(Modifier.padding(bottom = 24.dp)) {}
    }
}

@Composable
private fun Hero(item: CatalogItem?) {
    val ctx = LocalContext.current
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 10f)
            .padding(16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant),
    ) {
        if (item != null) {
            val url = PosterUrl.backdrop(item.backdropPath) ?: PosterUrl.poster(item.posterPath)
            if (url != null) {
                AsyncImage(
                    model = url,
                    contentDescription = item.displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            Box(
                Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            0.6f to Color.Black.copy(alpha = 0.45f),
                            1f to Color.Black.copy(alpha = 0.85f),
                        ),
                    ),
            )
            Column(
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(item.displayTitle, color = Color.White, style = MaterialTheme.typography.headlineLarge)
                Text(
                    item.overview.orEmpty().take(120),
                    color = Color.White.copy(alpha = 0.85f),
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                )
                Button(
                    onClick = {
                        ctx.startActivity(
                            Intent(ctx, PlayerActivity::class.java).apply {
                                putExtra(PlayerActivity.EXTRA_TYPE, item.kind)
                                putExtra(PlayerActivity.EXTRA_ID, item.id.toString())
                            },
                        )
                    },
                ) { Text(stringResource(R.string.btn_watch)) }
            }
        }
    }
}
