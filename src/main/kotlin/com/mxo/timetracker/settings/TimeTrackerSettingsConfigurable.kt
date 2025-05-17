package com.mxo.timetracker.settings

import com.intellij.openapi.options.Configurable
import javax.swing.*
import com.mxo.timetracker.settings.TimeTrackerSettings

class TimeTrackerSettingsConfigurable : Configurable {

    private lateinit var panel: JPanel
    private lateinit var autoStartCheckbox: JCheckBox
    private lateinit var showPopupCheckbox: JCheckBox

    private val settings = TimeTrackerSettings.getInstance()

    override fun getDisplayName(): String = "MXO Time Tracker"

    override fun createComponent(): JComponent {
        panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)

        autoStartCheckbox = JCheckBox("Automatically start browsing tracker")
        showPopupCheckbox = JCheckBox("Show popup when time is tracked")

        panel.add(autoStartCheckbox)
        panel.add(showPopupCheckbox)

        return panel
    }

    override fun isModified(): Boolean {
        val state = settings.state
        return autoStartCheckbox.isSelected != state.autoStart ||
                showPopupCheckbox.isSelected != state.showPopup
    }

    override fun apply() {
        val state = settings.state
        state.autoStart = autoStartCheckbox.isSelected
        state.showPopup = showPopupCheckbox.isSelected
    }

    override fun reset() {
        val state = settings.state
        autoStartCheckbox.isSelected = state.autoStart
        showPopupCheckbox.isSelected = state.showPopup
    }

    override fun disposeUIResources() {
        // Optional: clean up UI resources
    }
}
