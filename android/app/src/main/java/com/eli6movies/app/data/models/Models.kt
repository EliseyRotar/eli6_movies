package com.eli6movies.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CatalogItem(
    val id: Int,
    val title: String? = null,
    val name: String? = null,
    @SerialName("poster_path") val posterPath: String? = null,
    @SerialName("backdrop_path") val backdropPath: String? = null,
    @SerialName("vote_average") val voteAverage: Double? = null,
    @SerialName("release_date") val releaseDate: String? = null,
    @SerialName("first_air_date") val firstAirDate: String? = null,
    val overview: String? = null,
    @SerialName("media_type") val mediaType: String? = null,
    val type: String? = null,
) {
    val displayTitle: String get() = title ?: name ?: ""
    val kind: String get() = type ?: mediaType ?: "movie"
}

@Serializable
data class CatalogResponse(
    val results: List<CatalogItem> = emptyList(),
    val page: Int? = null,
    @SerialName("total_pages") val totalPages: Int? = null,
)

@Serializable
data class UserProfile(
    val username: String? = null,
    val email: String? = null,
    val role: String? = null,
    @SerialName("emailVerified") val emailVerified: Boolean? = null,
    val avatarUrl: String? = null,
)

@Serializable
data class AuthRequest(val email: String, val password: String, val username: String? = null)

@Serializable
data class AuthResponse(
    val success: Boolean? = null,
    val message: String? = null,
    val user: UserProfile? = null,
)

@Serializable
data class MyListItem(
    val id: Int,
    val title: String,
    val type: String,
    @SerialName("poster_path") val posterPath: String? = null,
    val overview: String? = null,
)
