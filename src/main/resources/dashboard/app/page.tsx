"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { LicenseValidation } from "@/components/license/license-validation"
import { AppLoadingScreen } from "@/components/license/app-loading-screen"

import { Header } from "@/components/dashboard/header"
import { WeekNavigation } from "@/components/dashboard/week-navigation"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { useTimeTrackingData } from "@/hooks/use-time-tracking-data"
import { useLicenseValidation } from "@/hooks/use-license-validation"
import { useOnboarding } from "@/hooks/use-onboarding"
import "@/styles/driver-theme.css"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLicenseValid, isInitializing, validateLicense, logout, getLicenseInfo } = useLicenseValidation()
  const licenseInfo = getLicenseInfo()
  const { hasCompletedOnboarding, isLoading: onboardingLoading, markOnboardingComplete, resetOnboarding } = useOnboarding(isLicenseValid)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Get URL parameters
  const tab = searchParams.get("tab") || "timesheet"
  const week = searchParams.get("week")

  // Initialize current week from URL or default to current week
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (week) {
      const weekDate = new Date(week)
      if (!isNaN(weekDate.getTime())) {
        return weekDate
      }
    }
    return new Date()
  })

  // Use ref to track if we're programmatically updating the URL
  const isUpdatingUrlRef = useRef(false)

  // Pass license validation status to the data hook
  const {
    statsData,
    projectUrls,
    ignoredProjects,
    projectCustomNames,
    projectClients,
    commits,
    wrikeProjects,
    wrikeProjectsLoading,
    loading,
    error,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    storageType,
    setStorageType,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    fetchWrikeProjects,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
    reassignSessionsProject,
    addIgnoredProject,
    removeIgnoredProject,
    saveProjectCustomName,
    removeProjectCustomName,
    saveProjectClient,
    removeProjectClient,
  } = useTimeTrackingData(isLicenseValid, licenseInfo?.isDemo || false)

  // Update current week from URL parameter (only when URL changes externally)
  useEffect(() => {
    if (week && !isUpdatingUrlRef.current) {
      const weekDate = new Date(week)
      if (!isNaN(weekDate.getTime())) {
        const currentWeekString = currentWeek.toISOString().split("T")[0]
        if (week !== currentWeekString) {
          setCurrentWeek(weekDate)
        }
      }
    }
  }, [week, currentWeek])

  // Function to update URL without page reload
  const updateUrl = (params: { tab?: string; week?: string }) => {
    isUpdatingUrlRef.current = true

    const newSearchParams = new URLSearchParams(searchParams.toString())

    if (params.tab) {
      newSearchParams.set("tab", params.tab)
    }

    if (params.week) {
      newSearchParams.set("week", params.week)
    }

    const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`
    router.push(newUrl, { scroll: false })

    // Reset the flag after a brief delay
    setTimeout(() => {
      isUpdatingUrlRef.current = false
    }, 100)
  }

  // Handle week navigation with URL update
  const handleWeekNavigation = (direction: "prev" | "next" | "current") => {
    let newWeek: Date

    if (direction === "current") {
      newWeek = new Date()
    } else {
      newWeek = new Date(currentWeek)
      newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
    }

    // Update local state first
    setCurrentWeek(newWeek)

    // Then update URL
    const weekString = newWeek.toISOString().split("T")[0]
    updateUrl({ week: weekString })
  }

  // Handle tab changes with URL update
  const handleTabChange = (newTab: string) => {
    updateUrl({ tab: newTab })
  }

  // Show onboarding tour when not completed and data is loaded
  useEffect(() => {
    if (!onboardingLoading && !hasCompletedOnboarding && !loading && isLicenseValid) {
      setShowOnboarding(true)
    }
  }, [onboardingLoading, hasCompletedOnboarding, loading, isLicenseValid])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    markOnboardingComplete()
    setShowOnboarding(false)
  }

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    markOnboardingComplete()
    setShowOnboarding(false)
  }

  // Handle restart tour
  const handleRestartTour = () => {
    resetOnboarding()
    setShowOnboarding(true)
  }

  // Show loading screen while initializing license check
  if (isInitializing) {
    return <AppLoadingScreen />
  }

  // Show license validation page if not validated
  if (!isLicenseValid) {
    return <LicenseValidation onValidate={validateLicense} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600 dark:text-teal-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading time tracking data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <Button onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          idleTimeoutMinutes={idleTimeoutMinutes}
          onIdleTimeoutChange={setIdleTimeoutMinutes}
          storageType={storageType}
          onStorageTypeChange={setStorageType}
          onRefresh={fetchStats}
          onLogout={logout}
          onRestartTour={handleRestartTour}
          settingsLoading={settingsLoading}
        />

        <WeekNavigation currentWeek={currentWeek} onNavigateWeek={handleWeekNavigation} />

        <DashboardTabs
          statsData={statsData}
          ignoredProjects={ignoredProjects}
          projectCustomNames={projectCustomNames}
          projectClients={projectClients}
          projectUrls={projectUrls}
          commits={commits}
          wrikeProjects={wrikeProjects}
          wrikeProjectsLoading={wrikeProjectsLoading}
          wrikeProjectMappings={[]}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onIdleTimeoutChange={setIdleTimeoutMinutes}
          onAddIgnoredProject={addIgnoredProject}
          onRemoveIgnoredProject={removeIgnoredProject}
          onSaveProjectCustomName={saveProjectCustomName}
          onRemoveProjectCustomName={removeProjectCustomName}
          onSaveProjectClient={saveProjectClient}
          onRemoveProjectClient={removeProjectClient}
          onCreateUrl={createProjectUrl}
          onUpdateUrl={updateProjectUrl}
          onDeleteUrl={deleteProjectUrl}
          onReassignSessionsProject={reassignSessionsProject}
          onFetchWrikeProjects={fetchWrikeProjects}
          onSaveWrikeMapping={() => Promise.resolve()}
          activeTab={tab}
          onTabChange={handleTabChange}
        />

        {showOnboarding && (
          <OnboardingTour
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </div>
    </div>
  )
}
