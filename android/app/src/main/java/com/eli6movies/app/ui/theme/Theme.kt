package com.eli6movies.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkScheme = darkColorScheme(
    primary       = Accent,
    onPrimary     = TextHi,
    secondary     = Accent2,
    onSecondary   = TextHi,
    tertiary      = Accent3,
    background    = Bg,
    onBackground  = TextHi,
    surface       = Surface1,
    onSurface     = TextHi,
    surfaceVariant = Surface2,
    onSurfaceVariant = TextMid,
    error         = RedError,
    outline       = BorderLine,
    outlineVariant = BorderLine2,
)

@Composable
fun Eli6Theme(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // ELI6 is always dark, to match the brand. Switchable later.
    MaterialTheme(
        colorScheme = DarkScheme,
        typography = AppTypography,
        content = content,
    )
}
