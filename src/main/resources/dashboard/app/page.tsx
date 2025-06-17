"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { LicenseValidation } from "@/components/license/license-validation"
import { AppLoadingScreen } from "@/components/license/app-loading-screen"

// Types for the API data
interface Session {
  start: string
  end: string
  type: "coding" | "browsing"
}

interface ProjectData {
  duration: number
  sessions: Session[]
}

interface DayData {
  [projectName: string]: ProjectData
}

interface StatsData {
  [date: string]: DayData
}

interface ProjectUrl {
  id: string
  projectName: string
  url: string
  description: string
}

import { Header } from "@/components/dashboard/header"
import { WeekNavigation } from "@/components/dashboard/week-navigation"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { useTimeTrackingData } from "@/hooks/use-time-tracking-data"
import { useLicenseValidation } from "@/hooks/use-license-validation"

export default function TimeTrackingDashboard() {
  const { isLicenseValid, isInitializing, validateLicense, logout } = useLicenseValidation()

  // Pass license validation status to the data hook
  const {
    statsData,
    projectUrls,
    ignoredProjects,
    loading,
    error,
    currentWeek,
    setCurrentWeek,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
    addIgnoredProject,
    removeIgnoredProject,
  } = useTimeTrackingData(isLicenseValid)

  // State for project selection
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

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
          onRefresh={fetchStats}
          onLogout={logout}
          settingsLoading={settingsLoading}
        />

        <WeekNavigation currentWeek={currentWeek} onNavigateWeek={setCurrentWeek} />

        <QuickStats
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onViewProject={setSelectedProject}
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
          onProjectSelect={setSelectedProject}
        />
      </div>
    </div>
  )
}
