package com.eli6movies.app.data.repo

import com.eli6movies.app.data.api.RetrofitClient
import com.eli6movies.app.data.models.AuthRequest
import com.eli6movies.app.data.models.UserProfile

object AuthRepository {
    suspend fun login(email: String, password: String): Result<UserProfile> = runCatching {
        RetrofitClient.api.login(AuthRequest(email = email, password = password))
        RetrofitClient.api.profile()
    }

    suspend fun register(username: String, email: String, password: String): Result<UserProfile> = runCatching {
        RetrofitClient.api.register(AuthRequest(email = email, password = password, username = username))
        RetrofitClient.api.profile()
    }

    suspend fun profile(): UserProfile? = runCatching { RetrofitClient.api.profile() }.getOrNull()

    suspend fun logout() {
        runCatching { RetrofitClient.api.logout() }
        RetrofitClient.clearCookies()
    }
}
