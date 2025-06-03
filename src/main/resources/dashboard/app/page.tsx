"use client"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

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
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { useTimeTrackingData } from "@/hooks/use-time-tracking-data"
import {} from "lucide-react"
import {} from "@/components/ui/button"

export default function TimeTrackingDashboard() {
  const {
    statsData,
    projectUrls,
    loading,
    error,
    currentWeek,
    setCurrentWeek,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    fetchStats,
    fetchProjectUrls,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
  } = useTimeTrackingData()

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
        />

        <WeekNavigation currentWeek={currentWeek} onNavigateWeek={setCurrentWeek} />

        <QuickStats statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />

        <DashboardTabs
          statsData={statsData}
          projectUrls={projectUrls}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onCreateUrl={createProjectUrl}
          onUpdateUrl={updateProjectUrl}
          onDeleteUrl={deleteProjectUrl}
          onRefreshUrls={fetchProjectUrls}
        />

        <RecentActivities statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />
      </div>
    </div>
  )
}
