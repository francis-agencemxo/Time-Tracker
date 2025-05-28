package com.codepulse.timetracker.license

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.layout.panel
import java.awt.Panel
import javax.swing.Box
import javax.swing.BoxLayout
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JTextField

class LicenseDialog(project: Project?) : DialogWrapper(project) {

    private val emailField = JTextField()
    private val keyField = JTextField()

    init {
        title = "Activate CodePulse License"
        init()
    }

    override fun createCenterPanel(): JComponent {
        val panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)

        panel.add(JLabel("Email:"))
        panel.add(emailField)
        panel.add(Box.createVerticalStrut(8))
        panel.add(JLabel("License Key:"))
        panel.add(keyField)

        return panel
    }

    fun getEmail(): String = emailField.text.trim()
    fun getLicenseKey(): String = keyField.text.trim()
}
