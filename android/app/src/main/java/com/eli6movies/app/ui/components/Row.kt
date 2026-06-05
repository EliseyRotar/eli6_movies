package com.eli6movies.app.ui.components

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.player.PlayerActivity

@Composable
fun CatalogRow(title: String, items: List<CatalogItem>) {
    if (items.isEmpty()) return
    val ctx = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 16.dp),
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) {
            items(items) { item ->
                PosterCard(item) {
                    val intent = Intent(ctx, PlayerActivity::class.java).apply {
                        putExtra(PlayerActivity.EXTRA_TYPE, item.kind)
                        putExtra(PlayerActivity.EXTRA_ID, item.id.toString())
                    }
                    ctx.startActivity(intent)
                }
            }
        }
    }
}
