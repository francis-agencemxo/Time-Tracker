package com.mxo.timetracker.settings

import com.intellij.openapi.options.Configurable
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JCheckBox
import javax.swing.BoxLayout

class TimeTrackerSettingsConfigurable : Configurable {
    private var panel: JPanel? = null
    private var autoStartCheckbox: JCheckBox? = null
    private var showPopupCheckbox: JCheckBox? = null

    override fun getDisplayName(): String = "MXO Time Tracker"

    override fun createComponent(): JComponent {
        println("MXO Settings UI loaded")
        panel = JPanel()
        panel!!.layout = BoxLayout(panel, BoxLayout.Y_AXIS)

        autoStartCheckbox = JCheckBox("Automatically start browsing tracker")
        showPopupCheckbox = JCheckBox("Show popup when time is tracked")

        panel!!.add(autoStartCheckbox)
        panel!!.add(showPopupCheckbox)

        return panel!!
    }

    override fun isModified(): Boolean {
        return false // implement logic later
    }

    override fun apply() {
        // apply settings here
    }

    override fun reset() {
        // reset values to stored settings
    }

    override fun disposeUIResources() {
        panel = null
        autoStartCheckbox = null
        showPopupCheckbox = null
    }
}
