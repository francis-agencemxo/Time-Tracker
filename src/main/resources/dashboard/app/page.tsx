"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { LicenseValidation } from "@/components/license/license-validation"
import { AppLoadingScreen } from "@/components/license/app-loading-screen"

import { Header } from "@/components/dashboard/header"
import { WeekNavigation } from "@/components/dashboard/week-navigation"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { useTimeTrackingData } from "@/hooks/use-time-tracking-data"
import { useLicenseValidation } from "@/hooks/use-license-validation"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLicenseValid, isInitializing, validateLicense, logout } = useLicenseValidation()

  // Get URL parameters
  const tab = searchParams.get("tab") || "weekly"
  const project = searchParams.get("project")
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

  // State for project selection
  const [selectedProject, setSelectedProject] = useState<string | null>(project)

  // Use ref to track if we're programmatically updating the URL
  const isUpdatingUrlRef = useRef(false)

  // Pass license validation status to the data hook - but don't pass week navigation
  const {
    statsData,
    projectUrls,
    ignoredProjects,
    loading,
    error,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    storageType,
    setStorageType,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
    addIgnoredProject,
    removeIgnoredProject,
  } = useTimeTrackingData(isLicenseValid)

  // Update selected project from URL parameter
  useEffect(() => {
    setSelectedProject(project)
  }, [project])

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
  const updateUrl = (params: { tab?: string; project?: string | null; week?: string }) => {
    isUpdatingUrlRef.current = true

    const newSearchParams = new URLSearchParams(searchParams.toString())

    if (params.tab) {
      newSearchParams.set("tab", params.tab)
    }

    if (params.project !== undefined) {
      if (params.project) {
        newSearchParams.set("project", params.project)
      } else {
        newSearchParams.delete("project")
      }
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

  // Handle project selection with URL update
  const handleProjectSelect = (projectName: string | null) => {
    setSelectedProject(projectName)
    updateUrl({ project: projectName })
  }

  // Handle week navigation with URL update - completely separate from the hook
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
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading time tracking data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          idleTimeoutMinutes={idleTimeoutMinutes}
          onIdleTimeoutChange={setIdleTimeoutMinutes}
          storageType={storageType}
          onStorageTypeChange={setStorageType}
          onRefresh={fetchStats}
          onLogout={logout}
          settingsLoading={settingsLoading}
        />

        <WeekNavigation currentWeek={currentWeek} onNavigateWeek={handleWeekNavigation} />

        <QuickStats
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onViewProject={handleProjectSelect}
        />

        <DashboardTabs
          statsData={statsData}
          projectUrls={projectUrls}
          ignoredProjects={ignoredProjects}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onCreateUrl={createProjectUrl}
          onUpdateUrl={updateProjectUrl}
          onDeleteUrl={deleteProjectUrl}
          onRefreshUrls={fetchProjectUrls}
          onAddIgnoredProject={addIgnoredProject}
          onRemoveIgnoredProject={removeIgnoredProject}
          selectedProject={selectedProject || undefined}
          onProjectSelect={handleProjectSelect}
          activeTab={tab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  )
}
