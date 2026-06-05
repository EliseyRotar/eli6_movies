package com.eli6movies.app

import android.app.Application
import com.eli6movies.app.analytics.Beacon
import com.eli6movies.app.data.api.RetrofitClient

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
        RetrofitClient.init(this)
        Beacon.init(this)
    }

    companion object {
        lateinit var instance: App
            private set
    }
}
