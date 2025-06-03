package com.codepulse.timetracker.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service

@State(
    name = "TimeTrackerSettings",
    storages = [Storage("codepulse-time-tracker.xml")]
)
@Service(Service.Level.APP) // <-- THIS IS CRUCIAL
class TimeTrackerSettings : PersistentStateComponent<TimeTrackerSettings.State> {

    class State {
        var autoStart: Boolean = false
        var showPopup: Boolean = false
        var dailyGoalHours: Double = 8.0
        var keystrokeTimeoutSeconds: Int = 600
        /** Port for the built-in Tracker HTTP API server (default 56000) */
        var trackerServerPort: Int = 56000
        /** Port for the Next.js dashboard dev server (default 3000) */
        var dashboardPort: Int = 3000
    }

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        fun getInstance(): TimeTrackerSettings = service()
    }
}
