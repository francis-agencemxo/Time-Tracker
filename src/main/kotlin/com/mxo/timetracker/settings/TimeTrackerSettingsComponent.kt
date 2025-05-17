package com.mxo.timetracker.settings

import javax.swing.*

class TimeTrackerSettingsComponent {
    private val panel = JPanel()
    private val portField = JTextField("13337", 10)
    private val autoStartCheckbox = JCheckBox("Start server automatically")
    private val showPopupCheckbox = JCheckBox("Show popup on browsing time logged")

    init {
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)
        panel.add(JLabel("Server Port:"))
        panel.add(portField)
        panel.add(autoStartCheckbox)
        panel.add(showPopupCheckbox)
    }

    fun getPanel(): JPanel = panel

    fun getPort(): Int = portField.text.toIntOrNull() ?: 13337
    fun isAutoStartEnabled(): Boolean = autoStartCheckbox.isSelected
    fun isPopupEnabled(): Boolean = showPopupCheckbox.isSelected

    fun setValues(port: Int, autoStart: Boolean, popup: Boolean) {
        portField.text = port.toString()
        autoStartCheckbox.isSelected = autoStart
        showPopupCheckbox.isSelected = popup
    }
}
