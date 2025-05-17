package com.mxo.timetracker.settings

import com.intellij.openapi.components.*
import com.intellij.util.xmlb.XmlSerializerUtil

@State(
    name = "TimeTrackerSettings",
    storages = [Storage("MXOTimeTracker.xml")]
)
@Service(Service.Level.APP)
class TimeTrackerSettingsState : PersistentStateComponent<TimeTrackerSettingsState> {

    var enabled: Boolean = true

    override fun getState(): TimeTrackerSettingsState = this

    override fun loadState(state: TimeTrackerSettingsState) {
        XmlSerializerUtil.copyBean(state, this)
    }

    companion object {
        val instance: TimeTrackerSettingsState
            get() = service()
    }
}
