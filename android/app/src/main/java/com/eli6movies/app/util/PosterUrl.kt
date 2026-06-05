package com.eli6movies.app.util

object PosterUrl {
    fun poster(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http")) return path
        return "https://image.tmdb.org/t/p/w500" + path
    }
    fun backdrop(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http")) return path
        return "https://image.tmdb.org/t/p/w1280" + path
    }
}
