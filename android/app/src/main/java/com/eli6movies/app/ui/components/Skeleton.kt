package com.eli6movies.app.ui.components

import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun Modifier.shimmer(): Modifier {
    val t = rememberInfiniteTransition(label = "shimmer")
    val x by t.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1400)),
        label = "x",
    )
    val brush = Brush.linearGradient(
        listOf(Color(0xFF1A1A24), Color(0xFF2A2A38), Color(0xFF1A1A24)),
        start = Offset(x * 1000f - 500f, 0f),
        end = Offset(x * 1000f, 200f),
    )
    return this.then(Modifier.background(brush))
}

@Composable
fun SkeletonBox(modifier: Modifier = Modifier, cornerDp: Int = 8) {
    Box(modifier.clip(RoundedCornerShape(cornerDp.dp)).shimmer())
}
