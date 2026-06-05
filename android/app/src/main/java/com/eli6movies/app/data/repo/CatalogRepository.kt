package com.eli6movies.app.data.repo

import com.eli6movies.app.data.api.RetrofitClient
import com.eli6movies.app.data.models.CatalogItem

object CatalogRepository {
    suspend fun trending():      List<CatalogItem> = runCatching { RetrofitClient.api.trending().results      }.getOrElse { emptyList() }
    suspend fun popularMovies(): List<CatalogItem> = runCatching { RetrofitClient.api.popularMovies().results }.getOrElse { emptyList() }
    suspend fun popularTv():     List<CatalogItem> = runCatching { RetrofitClient.api.popularTv().results    }.getOrElse { emptyList() }
    suspend fun topAnime():      List<CatalogItem> = runCatching { RetrofitClient.api.topAnime()             }.getOrElse { emptyList() }
    suspend fun keepWatching():  List<CatalogItem> = runCatching { RetrofitClient.api.keepWatching()         }.getOrElse { emptyList() }

    suspend fun search(query: String): List<CatalogItem> {
        if (query.isBlank()) return emptyList()
        return runCatching {
            RetrofitClient.api.searchMulti(query).results
                // drop persons; keep movies + TV (anime is just tv with keyword filter on TMDB)
                .filter { it.kind == "movie" || it.kind == "tv" }
                .filter { !it.posterPath.isNullOrBlank() }
        }.getOrElse { emptyList() }
    }
}
