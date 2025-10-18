"use client"

import { useState, useEffect } from "react"

const ONBOARDING_STORAGE_KEY = "mxo-time-tracker-onboarding-completed"

export const useOnboarding = (isLicenseValid = false) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true) // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true)

  // Fetch onboarding status from localStorage only (static export doesn't support API routes)
  useEffect(() => {
    const fetchOnboardingStatus = () => {
      if (!isLicenseValid) {
        setHasCompletedOnboarding(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY)
        setHasCompletedOnboarding(stored === "true")
      } catch (err) {
        console.warn("Error fetching onboarding status:", err)
        // Default to not completed to show onboarding
        setHasCompletedOnboarding(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnboardingStatus()
  }, [isLicenseValid])

  const markOnboardingComplete = () => {
    if (!isLicenseValid) return

    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
      setHasCompletedOnboarding(true)
    } catch (err) {
      console.error("Error marking onboarding complete:", err)
    }
  }

  const resetOnboarding = () => {
    if (!isLicenseValid) return

    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "false")
      setHasCompletedOnboarding(false)
    } catch (err) {
      console.error("Error resetting onboarding:", err)
    }
  }

  return {
    hasCompletedOnboarding,
    isLoading,
    markOnboardingComplete,
    resetOnboarding,
  }
}
