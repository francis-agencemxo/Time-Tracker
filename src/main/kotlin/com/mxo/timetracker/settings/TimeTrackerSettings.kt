package com.mxo.timetracker.settings

import com.intellij.openapi.components.*

@State(
    name = "MXOTimeTrackerSettings",
    storages = [Storage("mxo-time-tracker.xml")]
)
@Service(Service.Level.APP)
class TimeTrackerSettings : PersistentStateComponent<TimeTrackerSettings.State> {

    companion object {
        fun getInstance(): TimeTrackerSettings = service()
    }

    data class State(
        var serverPort: Int = 13337,
        var autoStartServer: Boolean = true,
        var showBrowsingPopup: Boolean = true
    )

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }
}
