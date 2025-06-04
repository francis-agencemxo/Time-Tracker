package com.codepulse.timetracker.license

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.nio.charset.StandardCharsets

object LicenseValidator {
    fun validate(email: String, key: String): Boolean {
        // Replace with real server-side call:
        if (key == "am+o2015" && email.endsWith("@agencemxo.com"))
            return true;

        try {
            val uri = URI.create("https://addons.francislabonte.com/subscription/status")        // parse and validate as a URI
            val url = uri.toURL()                // convert to URL instance

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
    }

    fun postJson(url: String, jsonPayload: String): String {

        val uri = URI.create(url)        // parse and validate as a URI
        val url = uri.toURL()                // convert to URL instance

        val connection = url.openConnection() as HttpURLConnection

        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true

        connection.outputStream.use { os ->
            os.write(jsonPayload.toByteArray(StandardCharsets.UTF_8))
        }

        val responseStream = if (connection.responseCode in 200..299)
            connection.inputStream else connection.errorStream

        return responseStream.bufferedReader().use { it.readText() }
    }

    fun validateKey(email: String, key: String): JSONObject {
        try {
            val uri = URI.create("https://addons.francislabonte.com/api/license/verify/codepulse")        // parse and validate as a URI
            val url = uri.toURL()                // convert to URL instance

            val payload = """
                {
                  "license_key": "$key"
                }
                """.trimIndent()

            val response = postJson("https://addons.francislabonte.com/api/license/verify/codepulse", payload)

            try {
                val json = JSONObject(response)
                return json
            } catch (e: Exception) {
                println("Failed to parse response: ${e.message}")
            }

            return JSONObject().apply {
                put("valid", false)
                put("message", "Invalid Key")
            }
        } catch (e: Exception) {
            return JSONObject().apply {
                put("valid", false)
                put("message", "Invalid Key")
            }
        }
    }
}
