"use client"

import { useState, useEffect } from "react"

const LICENSE_STORAGE_KEY = "mxo-time-tracker-license"
const LICENSE_API_URL = "https://addons.francislabonte.com/api"

export const useLicenseValidation = () => {
  const [isLicenseValid, setIsLicenseValid] = useState(false)
  const [validatedLicense, setValidatedLicense] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const baseUrl =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:${process.env.NEXT_PUBLIC_TRACKER_SERVER_PORT || "56000"}`

  // Check for existing valid license on mount
  useEffect(() => {
    const initializeLicense = async () => {
      const storedLicense = localStorage.getItem(LICENSE_STORAGE_KEY)
      if (storedLicense) {
        // Re-validate stored license with the API, only once every day
        // This could be improved with a timestamp check to avoid unnecessary API calls
        const lastChecked = localStorage.getItem(`${LICENSE_STORAGE_KEY}-last-checked`)
        const now = new Date().getTime()
        const oneDay = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        if (lastChecked && now - Number.parseInt(lastChecked) < oneDay) {
          // If checked within the last 24 hours, use cached result
          setIsLicenseValid(true)
          setValidatedLicense(storedLicense)
          setIsInitializing(false)
          return
        }
        const isValid = await validateLicenseWithAPI(storedLicense)
        if (isValid) {
          setIsLicenseValid(true)
          setValidatedLicense(storedLicense)
          localStorage.setItem(`${LICENSE_STORAGE_KEY}-last-checked`, now.toString())
        } else {
          // Remove invalid stored license
          localStorage.removeItem(LICENSE_STORAGE_KEY)
          localStorage.removeItem(`${LICENSE_STORAGE_KEY}-last-checked`)
        }
      }
      setIsInitializing(false)
    }

    initializeLicense()
  }, [])

  /**
   * Validates a license key with the external API
   */
  const validateLicenseWithAPI = async (licenseKey: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/api/license`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
        }),
      })

      if (!response.ok) {
        console.error("License validation API error:", response.status, response.statusText)
        return false
      }

      const result = await response.json()

      // Assuming the API returns { valid: boolean, ... }
      // Adjust this based on the actual API response format
      return result.valid === true || result.status === "valid"
    } catch (error) {
      console.error("License validation error:", error)

      // Fallback: check against demo keys if API is unavailable
      const demoKeys = ["MXO-DEV-2024-TRACK-001", "MXO-PRO-2024-TRACK-002", "MXO-ENT-2024-TRACK-003"]
      return demoKeys.includes(licenseKey.trim().toUpperCase())
    }
  }

  /**
   * Attempts to validate and store a license key
   */
  const validateLicense = async (licenseKey: string): Promise<boolean> => {
    const isValid = await validateLicenseWithAPI(licenseKey)

    if (!isValid) {
      console.warn("Invalid license key:", licenseKey)
      return false
    }
    if (isValid) {
      const trimmedKey = licenseKey.trim().toUpperCase()
      localStorage.setItem(LICENSE_STORAGE_KEY, trimmedKey)
      setIsLicenseValid(true)
      setValidatedLicense(trimmedKey)
      return true
    }

    return false
  }

  /**
   * Logs out the user by clearing the stored license
   */
  const logout = () => {
    localStorage.removeItem(LICENSE_STORAGE_KEY)
    localStorage.removeItem(`${LICENSE_STORAGE_KEY}-last-checked`)
    setIsLicenseValid(false)
    setValidatedLicense(null)
  }

  /**
   * Gets license information for display purposes
   */
  const getLicenseInfo = () => {
    if (!validatedLicense) return null

    // Parse license type from the key
    let licenseType = "Unknown"
    if (validatedLicense.includes("-DEV-")) {
      licenseType = "Developer"
    } else if (validatedLicense.includes("-PRO-")) {
      licenseType = "Professional"
    } else if (validatedLicense.includes("-ENT-")) {
      licenseType = "Enterprise"
    }

    // Check if it's a demo key
    const demoKeys = ["MXO-DEV-2024-TRACK-001", "MXO-PRO-2024-TRACK-002", "MXO-ENT-2024-TRACK-003"]
    const isDemo = demoKeys.includes(validatedLicense)

    return {
      key: validatedLicense,
      type: licenseType,
      isDemo,
    }
  }

  return {
    isLicenseValid,
    validatedLicense,
    isInitializing,
    validateLicense,
    logout,
    getLicenseInfo,
  }
}
