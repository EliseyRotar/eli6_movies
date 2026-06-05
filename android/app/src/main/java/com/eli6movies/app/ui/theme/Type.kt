package com.eli6movies.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val Default = FontFamily.SansSerif

val AppTypography = Typography(
    displayLarge   = TextStyle(fontFamily = Default, fontWeight = FontWeight.Black,    fontSize = 30.sp, lineHeight = 36.sp, letterSpacing = (-0.5).sp),
    headlineLarge  = TextStyle(fontFamily = Default, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, lineHeight = 28.sp),
    headlineMedium = TextStyle(fontFamily = Default, fontWeight = FontWeight.Bold,      fontSize = 18.sp, lineHeight = 24.sp),
    titleMedium    = TextStyle(fontFamily = Default, fontWeight = FontWeight.SemiBold,  fontSize = 15.sp, lineHeight = 20.sp),
    titleSmall     = TextStyle(fontFamily = Default, fontWeight = FontWeight.SemiBold,  fontSize = 13.sp, lineHeight = 18.sp),
    bodyLarge      = TextStyle(fontFamily = Default, fontWeight = FontWeight.Normal,    fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium     = TextStyle(fontFamily = Default, fontWeight = FontWeight.Normal,    fontSize = 13.sp, lineHeight = 18.sp),
    bodySmall      = TextStyle(fontFamily = Default, fontWeight = FontWeight.Normal,    fontSize = 11.sp, lineHeight = 14.sp),
    labelLarge     = TextStyle(fontFamily = Default, fontWeight = FontWeight.Bold,      fontSize = 13.sp, letterSpacing = 0.3.sp),
    labelMedium    = TextStyle(fontFamily = Default, fontWeight = FontWeight.SemiBold,  fontSize = 11.sp, letterSpacing = 0.5.sp),
    labelSmall     = TextStyle(fontFamily = Default, fontWeight = FontWeight.SemiBold,  fontSize = 10.sp, letterSpacing = 0.7.sp),
)
