package com.codepulse.timetracker.license

import com.intellij.openapi.components.*
import java.util.Date

@State(name = "TimeTrackerLicenseState", storages = [Storage("TimeTrackerLicense.xml")])
class LicenseStateService : PersistentStateComponent<LicenseStateService.State> {

    data class State(
        var email: String? = null,
        var licenseKey: String? = null,
        var isValid: Boolean = false,
        var lastCheck: Date = Date(0) // default to epoch (Jan 1, 1970)
    )

    private var state = State()

    override fun getState(): State = state
    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        fun getInstance(): LicenseStateService = service()
    }
}
