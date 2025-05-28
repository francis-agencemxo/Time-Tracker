package com.codepulse.timetracker.license

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.ui.layout.panel
import java.awt.BorderLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import java.awt.Panel
import javax.swing.Box
import javax.swing.BoxLayout
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JTextField

class LicenseDialog(project: Project?) : DialogWrapper(project) {

    private val emailField   = JBTextField().apply { columns = 15 }
    private val keyField = JBTextField().apply { columns = 15 }

    init {
        title = "Activate CodePulse License"
        init()
    }

    override fun createCenterPanel(): JComponent {
        val panel = JPanel(GridBagLayout())
        val gbcLabel = GridBagConstraints().apply {
            anchor   = GridBagConstraints.WEST
            insets   = Insets(8, 8, 4, 4)
            weightx  = 0.0
            fill     = GridBagConstraints.NONE
        }
        val gbcField = GridBagConstraints().apply {
            anchor   = GridBagConstraints.WEST
            insets   = Insets(8, 0, 4, 8)
            weightx  = 1.0
            fill     = GridBagConstraints.HORIZONTAL
        }

        // Row 0: Email label + field
        gbcLabel.gridx = 0; gbcLabel.gridy = 0
        panel.add(JBLabel("Email:"), gbcLabel)
        gbcField.gridx = 1; gbcField.gridy = 0
        panel.add(emailField, gbcField)

        // Row 1: License Key label + field
        gbcLabel.gridy = 1
        panel.add(JBLabel("License Key:"), gbcLabel)
        gbcField.gridy = 1
        panel.add(keyField, gbcField)

        return panel
    }

    override fun getPreferredFocusedComponent(): JComponent? = emailField

    fun getEmail(): String = emailField.text.trim()
    fun getLicenseKey(): String = keyField.text.trim()
}
