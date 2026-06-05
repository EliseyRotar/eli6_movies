package com.eli6movies.app.ui.screens.home

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.derivedStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.data.repo.CatalogRepository
import com.eli6movies.app.player.PlayerActivity
import com.eli6movies.app.ui.components.ContinueCard
import com.eli6movies.app.ui.components.NumberedPosterCard
import com.eli6movies.app.ui.components.PosterCard
import com.eli6movies.app.ui.components.SectionHeader
import com.eli6movies.app.ui.components.SkeletonBox
import com.eli6movies.app.util.PosterUrl
import kotlinx.coroutines.delay

private val FG_HI = Color(0xFFEAEAF8)
private val FG_MUTE = Color(0xFF9999B5)
private val FG_DIM = Color(0xFF55556A)
private val BRAND = Color(0xFFE5FF00)
private val SURFACE = Color(0xFF15151E)

@Composable
fun HomeScreen(onSearch: () -> Unit = {}) {
    val ctx = LocalContext.current
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

    fun openPlayer(item: CatalogItem) {
        ctx.startActivity(
            Intent(ctx, PlayerActivity::class.java).apply {
                putExtra(PlayerActivity.EXTRA_TYPE, item.kind)
                putExtra(PlayerActivity.EXTRA_ID, item.id.toString())
            },
        )
    }

    val listState = rememberLazyListState()
    val scrolled by remember { derivedStateOf { listState.firstVisibleItemScrollOffset > 60 } }

    Box(Modifier.fillMaxSize().background(Color(0xFF0A0A0E))) {
        if (loading) {
            HomeSkeleton()
        } else {
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(22.dp),
            ) {
                item { FeaturedHero(trending.take(5), ::openPlayer) }
                item { CategoryChips() }
                if (keepWatching.isNotEmpty()) {
                    item { SectionHeader("Continue watching") }
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp),
                        ) {
                            items(keepWatching) { ContinueCard(it) { openPlayer(it) } }
                        }
                    }
                }
                item { SectionHeader("Top 10 trending") }
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp),
                    ) {
                        itemsIndexed(trending.take(10)) { i, it ->
                            NumberedPosterCard(rank = i + 1, item = it) { openPlayer(it) }
                        }
                    }
                }
                item { SectionHeader("Popular movies") }
                item { PosterRow(popularMovies, ::openPlayer) }
                item { SectionHeader("Popular TV") }
                item { PosterRow(popularTv, ::openPlayer) }
                item { SectionHeader("Top anime") }
                item { PosterRow(anime, ::openPlayer) }
            }
        }

        TopBar(scrolled = scrolled, onSearch = onSearch, modifier = Modifier.align(Alignment.TopCenter))
    }
}

@Composable
private fun PosterRow(items: List<CatalogItem>, onClick: (CatalogItem) -> Unit) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
    ) {
        items(items) { PosterCard(it) { onClick(it) } }
    }
}

@Composable
private fun TopBar(scrolled: Boolean, onSearch: () -> Unit, modifier: Modifier = Modifier) {
    val bg = if (scrolled) Color(0xFF0A0A0E).copy(alpha = 0.92f) else Color.Transparent
    Row(
        modifier
            .fillMaxWidth()
            .background(bg)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(BRAND),
                contentAlignment = Alignment.Center,
            ) {
                Text("E6", color = Color(0xFF0A0A0E), fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
            Text(
                "ELI6 movies",
                color = FG_HI,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        Box(
            Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(20.dp))
                .clickable { onSearch() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Search, contentDescription = "Search", tint = FG_HI)
        }
    }
}

@Composable
private fun FeaturedHero(items: List<CatalogItem>, onClick: (CatalogItem) -> Unit) {
    if (items.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { items.size })
    LaunchedEffect(items.size) {
        while (items.size > 1) {
            delay(5500)
            val next = (pagerState.currentPage + 1) % items.size
            pagerState.animateScrollToPage(next)
        }
    }
    Box(Modifier.fillMaxWidth().aspectRatio(2f / 3.1f).background(Color(0xFF0A0A0E))) {
        HorizontalPager(state = pagerState) { page ->
            HeroPage(items[page], onClick)
        }
        // page dots
        Row(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            repeat(items.size) { i ->
                Box(
                    Modifier
                        .size(if (i == pagerState.currentPage) 18.dp else 6.dp, 6.dp)
                        .clip(CircleShape)
                        .background(
                            if (i == pagerState.currentPage) BRAND else Color.White.copy(alpha = 0.35f),
                        ),
                )
            }
        }
    }
}

@Composable
private fun HeroPage(item: CatalogItem, onClick: (CatalogItem) -> Unit) {
    Box(Modifier.fillMaxSize()) {
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
                        0.45f to Color.Transparent,
                        0.95f to Color(0xFF0A0A0E),
                        1f to Color(0xFF0A0A0E),
                    ),
                ),
        )
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 20.dp, vertical = 30.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                item.displayTitle,
                color = FG_HI,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                lineHeight = 30.sp,
                maxLines = 2,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                item.voteAverage?.takeIf { it > 0 }?.let {
                    Text(
                        "★ ${"%.1f".format(it)}",
                        color = BRAND,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                (item.releaseDate ?: item.firstAirDate)?.take(4)?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = FG_MUTE, fontSize = 13.sp)
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color.White)
                        .padding(horizontal = 5.dp, vertical = 1.dp),
                ) {
                    Text(
                        "HD",
                        color = Color(0xFF0A0A0E),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            item.overview?.take(120)?.let {
                Text(
                    it,
                    color = FG_MUTE,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    maxLines = 2,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BRAND)
                        .clickable { onClick(item) }
                        .padding(horizontal = 22.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.PlayArrow, null, tint = Color(0xFF0A0A0E), modifier = Modifier.size(20.dp))
                    Text(
                        "Watch",
                        color = Color(0xFF0A0A0E),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
                Row(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.White.copy(alpha = 0.16f))
                        .padding(horizontal = 18.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Add, null, tint = FG_HI, modifier = Modifier.size(18.dp))
                    Text(
                        "My List",
                        color = FG_HI,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryChips() {
    val chips = listOf("All", "Movies", "TV Shows", "Anime", "New & Trending")
    var selected by remember { mutableStateOf(0) }
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
    ) {
        itemsIndexed(chips) { i, label ->
            val on = i == selected
            Box(
                Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (on) BRAND else SURFACE)
                    .clickable { selected = i }
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    label,
                    color = if (on) Color(0xFF0A0A0E) else FG_HI,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun HomeSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp), modifier = Modifier.padding(top = 70.dp)) {
        SkeletonBox(
            Modifier.fillMaxWidth().aspectRatio(2f / 3.1f).padding(horizontal = 16.dp),
            cornerDp = 14,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(horizontal = 16.dp),
        ) {
            repeat(5) {
                SkeletonBox(Modifier.width(80.dp).height(32.dp), cornerDp = 999)
            }
        }
        repeat(3) {
            SkeletonBox(
                Modifier.width(150.dp).height(20.dp).padding(start = 16.dp),
                cornerDp = 6,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(horizontal = 16.dp),
            ) {
                repeat(4) {
                    SkeletonBox(Modifier.width(120.dp).height(180.dp), cornerDp = 10)
                }
            }
        }
    }
}
