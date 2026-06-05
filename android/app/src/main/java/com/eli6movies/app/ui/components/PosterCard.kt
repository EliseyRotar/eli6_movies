package com.eli6movies.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.util.PosterUrl

@Composable
fun PosterCard(item: CatalogItem, onClick: () -> Unit) {
    Column(
        Modifier
            .width(120.dp)
            .clickable { onClick() },
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            Modifier
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            val url = PosterUrl.poster(item.posterPath)
            if (url != null) {
                AsyncImage(
                    model = url,
                    contentDescription = item.displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Text(
                    text = item.displayTitle,
                    color = Color(0xFF9999B5),
                    fontSize = 11.sp,
                    modifier = Modifier.padding(8.dp).align(Alignment.Center),
                )
            }
            item.voteAverage?.takeIf { it > 0 }?.let { rating ->
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xCC0A0A0E))
                        .padding(horizontal = 5.dp, vertical = 2.dp),
                ) {
                    Text(
                        "★ ${"%.1f".format(rating)}",
                        color = Color(0xFFE5FF00),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
        Text(
            item.displayTitle,
            color = Color(0xFFEAEAF8),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
        )
    }
}
