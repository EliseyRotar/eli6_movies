package com.eli6movies.app.data.api

import com.eli6movies.app.data.models.AuthRequest
import com.eli6movies.app.data.models.AuthResponse
import com.eli6movies.app.data.models.CatalogItem
import com.eli6movies.app.data.models.CatalogResponse
import com.eli6movies.app.data.models.MyListItem
import com.eli6movies.app.data.models.UserProfile
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    // Catalog (TMDB proxy)
    @GET("tmdb/trending/all/week")
    suspend fun trending(): CatalogResponse

    @GET("tmdb/movie/popular")
    suspend fun popularMovies(@Query("page") page: Int = 1): CatalogResponse

    @GET("tmdb/tv/popular")
    suspend fun popularTv(@Query("page") page: Int = 1): CatalogResponse

    @GET("tmdb/movie/top_rated")
    suspend fun topRatedMovies(@Query("page") page: Int = 1): CatalogResponse

    // Anime via AniList proxy
    @GET("anime/trending")
    suspend fun topAnime(): List<CatalogItem>

    // Auth
    @POST("auth/login")
    suspend fun login(@Body body: AuthRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: AuthRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(): AuthResponse

    @GET("user/profile")
    suspend fun profile(): UserProfile

    // MyList
    @GET("user/mylist")
    suspend fun myList(): List<MyListItem>

    @POST("user/mylist")
    suspend fun addToMyList(@Body item: MyListItem): AuthResponse

    @POST("user/mylist/remove/{id}/{type}")
    suspend fun removeFromMyList(@Path("id") id: Int, @Path("type") type: String): AuthResponse

    // Keep watching
    @GET("user/keep-watching")
    suspend fun keepWatching(): List<CatalogItem>
}
