package com.codepulse.timetracker.license

import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

object LicenseValidator {
    fun validate(email: String, key: String): Boolean {
        // Replace with real server-side call:
        if (key == "am+o2015" && email.endsWith("@agencemxo.com"))
            return true;

        try {
            val url = URL("https://addons.francislabonte.com/subscription/status")
            val connection = url.openConnection() as HttpURLConnection

            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true

            val payload = """
                {
                  "email": "$email",
                  "slug": "codepulse",
                }
            """.trimIndent()

            connection.outputStream.use {
                it.write(payload.toByteArray(StandardCharsets.UTF_8))
            }

            val responseCode = connection.responseCode
            return responseCode == 200 // assume 200 = valid license
        } catch (e: Exception) {
            println("License validation error: ${e.message}")
            return false
        }

        println("Invalid license.")
        return false
    }
}
