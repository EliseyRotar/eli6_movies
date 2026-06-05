package com.eli6movies.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.util.PosterUrl

@Composable
fun NumberedPosterCard(rank: Int, item: CatalogItem, onClick: () -> Unit) {
    // Total card width: oversized number + slight overlap + poster
    Box(
        Modifier
            .width(170.dp)
            .height(170.dp)
            .clickable { onClick() },
    ) {
        // Background: big outlined rank, bottom-left
        Box(
            Modifier
                .matchParentSize()
                .padding(bottom = 6.dp)
                .drawBehind {
                    val txt = rank.toString()
                    val fillPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        textSize = 200f
                        typeface = android.graphics.Typeface.create(
                            android.graphics.Typeface.DEFAULT,
                            android.graphics.Typeface.BOLD,
                        )
                        color = 0xFF0A0A0E.toInt()
                        style = android.graphics.Paint.Style.FILL
                    }
                    val strokePaint = android.graphics.Paint(fillPaint).apply {
                        style = android.graphics.Paint.Style.STROKE
                        strokeWidth = 4f
                        color = 0x66EAEAF8.toInt()
                    }
                    val baseline = size.height - 6f
                    drawContext.canvas.nativeCanvas.drawText(txt, 0f, baseline, fillPaint)
                    drawContext.canvas.nativeCanvas.drawText(txt, 0f, baseline, strokePaint)
                },
        )
        // Poster, right-aligned
        Box(
            Modifier
                .align(Alignment.BottomEnd)
                .width(110.dp)
                .height(165.dp)
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
            }
        }
    }
}
