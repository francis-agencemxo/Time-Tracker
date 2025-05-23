package com.codepulse.timetracker.settings

import com.intellij.openapi.options.Configurable
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import java.awt.*
import javax.swing.*

class TimeTrackerSettingsConfigurable : Configurable {
    private val settings = TimeTrackerSettings.getInstance().state

    private var dailyGoalSpinner: JSpinner? = null
    private var timeoutSpinner: JSpinner? = null
    private var autoStartCheckbox: JBCheckBox? = null
    private var showPopupCheckbox: JBCheckBox? = null

    override fun getDisplayName(): String = "CodePulse Time Tracker"

    override fun createComponent(): JComponent {
        val outer = JBPanel<JBPanel<*>>()
        outer.layout = BorderLayout()

        val panel = JPanel(GridBagLayout())
        outer.add(panel, BorderLayout.NORTH)

        val gbcLabel = GridBagConstraints().apply {
            anchor = GridBagConstraints.WEST
            fill = GridBagConstraints.NONE
            gridx = 0
            weightx = 0.0
            insets = Insets(6, 10, 6, 10)
        }

        val gbcField = GridBagConstraints().apply {
            anchor = GridBagConstraints.WEST
            fill = GridBagConstraints.NONE
            gridx = 1
            weightx = 1.0
            insets = Insets(6, 0, 6, 10)
        }

        var row = 0

        autoStartCheckbox = JBCheckBox("Automatically start browsing tracker", settings.autoStart)
        gbcLabel.gridy = row
        gbcLabel.gridwidth = 2
        panel.add(autoStartCheckbox, gbcLabel)
        row++

        showPopupCheckbox = JBCheckBox("Show popup when time is tracked", settings.showPopup)
        gbcLabel.gridy = row
        panel.add(showPopupCheckbox, gbcLabel)
        row++

        gbcLabel.gridy = row
        gbcLabel.gridwidth = 1
        panel.add(JBLabel("Objectif quotidien (heures):"), gbcLabel)
        dailyGoalSpinner = JSpinner(SpinnerNumberModel(settings.dailyGoalHours, 1.0, 24.0, 0.5)).apply {
            preferredSize = Dimension(60, preferredSize.height)
        }
        gbcField.gridy = row
        panel.add(dailyGoalSpinner, gbcField)
        row++

        gbcLabel.gridy = row
        panel.add(JBLabel("Keystroke timeout (minutes):"), gbcLabel)
        timeoutSpinner = JSpinner(SpinnerNumberModel(settings.keystrokeTimeoutSeconds / 60, 1, 600, 1)).apply {
            preferredSize = Dimension(60, preferredSize.height)
        }
        gbcField.gridy = row
        panel.add(timeoutSpinner, gbcField)

        return outer
    }

    override fun isModified(): Boolean {
        return autoStartCheckbox?.isSelected != settings.autoStart ||
                showPopupCheckbox?.isSelected != settings.showPopup ||
                (dailyGoalSpinner?.value as? Double)?.compareTo(settings.dailyGoalHours) != 0 ||
                ((timeoutSpinner?.value as? Int)?.times(60)) != settings.keystrokeTimeoutSeconds
    }

    override fun apply() {
        settings.autoStart = autoStartCheckbox?.isSelected ?: settings.autoStart
        settings.showPopup = showPopupCheckbox?.isSelected ?: settings.showPopup
        settings.dailyGoalHours = (dailyGoalSpinner?.value as? Double) ?: settings.dailyGoalHours
        settings.keystrokeTimeoutSeconds = ((timeoutSpinner?.value as? Int)?.times(60)) ?: settings.keystrokeTimeoutSeconds
    }

    override fun reset() {
        autoStartCheckbox?.isSelected = settings.autoStart
        showPopupCheckbox?.isSelected = settings.showPopup
        dailyGoalSpinner?.value = settings.dailyGoalHours
        timeoutSpinner?.value = settings.keystrokeTimeoutSeconds / 60
    }

    override fun disposeUIResources() {}
}
