package com.eli6movies.app.data.repo

import com.eli6movies.app.data.api.RetrofitClient
import com.eli6movies.app.data.models.CatalogItem

object CatalogRepository {
    suspend fun trending():      List<CatalogItem> = runCatching { RetrofitClient.api.trending().results      }.getOrElse { emptyList() }
    suspend fun popularMovies(): List<CatalogItem> = runCatching { RetrofitClient.api.popularMovies().results }.getOrElse { emptyList() }
    suspend fun popularTv():     List<CatalogItem> = runCatching { RetrofitClient.api.popularTv().results    }.getOrElse { emptyList() }
    suspend fun topAnime():      List<CatalogItem> = runCatching { RetrofitClient.api.topAnime().results     }.getOrElse { emptyList() }
    suspend fun keepWatching():  List<CatalogItem> = runCatching { RetrofitClient.api.keepWatching()         }.getOrElse { emptyList() }
}
