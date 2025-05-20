package com.codepulse.timetracker.settings

import com.intellij.openapi.options.Configurable
import javax.swing.*
import java.awt.FlowLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets

class TimeTrackerSettingsConfigurable : Configurable {

    private lateinit var panel: JPanel
    private lateinit var autoStartCheckbox: JCheckBox
    private lateinit var showPopupCheckbox: JCheckBox
    private lateinit var spinner: JSpinner

    private val settings = TimeTrackerSettings.getInstance()

    override fun getDisplayName(): String = "MXO Time Tracker"

    override fun createComponent(): JComponent {

        autoStartCheckbox = JCheckBox("Automatically start browsing tracker")
        autoStartCheckbox.alignmentX = JPanel.LEFT_ALIGNMENT

        showPopupCheckbox = JCheckBox("Show popup when time is tracked")
        showPopupCheckbox.alignmentX = JPanel.LEFT_ALIGNMENT

        spinner = JSpinner(SpinnerNumberModel(
            TimeTrackerSettings.getInstance().state.dailyGoalHours, // initial
            0.0,    // min
            24.0,   // max
            0.5    // step
        ))

        val panel = JPanel(GridBagLayout())
        val c = GridBagConstraints().apply {
            anchor = GridBagConstraints.WEST
            insets = Insets(4, 10, 4, 10)
            gridx = 0
            gridy = 0
            fill = GridBagConstraints.HORIZONTAL
            weightx = 0.0
        }

// Row 1: Auto-start checkbox (spans 2 columns)
        autoStartCheckbox = JCheckBox("Automatically start browsing tracker")
        c.gridwidth = 2
        panel.add(autoStartCheckbox, c)

// Row 2
        c.gridy++
        showPopupCheckbox = JCheckBox("Show popup when time is tracked")
        panel.add(showPopupCheckbox, c)

// Row 3: Spinner label & control aligned
        c.gridy++
        c.gridwidth = 1
        c.gridx = 0
        c.weightx = 0.0
        panel.add(JLabel("Objectif quotidien (heures)"), c)

        c.gridx = 1
        c.weightx = 1.0
        spinner = JSpinner(SpinnerNumberModel(settings.state.dailyGoalHours, 0.0, 24.0, 0.5))
        panel.add(spinner, c)


        return panel

    }

    override fun isModified(): Boolean {
        val state = settings.state
        return autoStartCheckbox.isSelected != state.autoStart ||
                showPopupCheckbox.isSelected != state.showPopup ||
                (spinner.value as? Double) != state.dailyGoalHours
    }

    override fun apply() {
        val state = settings.state
        state.autoStart = autoStartCheckbox.isSelected
        state.showPopup = showPopupCheckbox.isSelected
        state.dailyGoalHours = (spinner.value as? Double) ?: 8.0
    }

    override fun reset() {
        val state = settings.state
        autoStartCheckbox.isSelected = state.autoStart
        showPopupCheckbox.isSelected = state.showPopup
        spinner.value = state.dailyGoalHours
    }

    override fun disposeUIResources() {
        // Optional: clean up UI resources
    }
}
