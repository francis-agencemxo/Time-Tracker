"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, FolderOpen, Users, Eye, ExternalLink } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface QuickStatsProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  onViewProject?: (projectName: string) => void
}

export function QuickStats({ statsData, currentWeek, idleTimeoutMinutes, onViewProject }: QuickStatsProps) {
  const {
    getTotalHoursThisWeek,
    getAvgHoursPerDay,
    getTargetHoursThisWeek,
    getActiveProjects,
    getCompletedTasks,
    getProjectTotals,
    getWeekStart,
    getWeekEnd,
    isCurrentWeek,
    formatHoursForChart,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

  const totalHours = getTotalHoursThisWeek()
  const targetHours = getTargetHoursThisWeek()
  const avgHoursPerDay = getAvgHoursPerDay()
  const activeProjects = getActiveProjects()
  const completedTasks = getCompletedTasks()
  const allProjects = getProjectTotals()
  const topProject = allProjects[0]

  // Create shareable link for current view
  const createShareableLink = () => {
    const currentUrl = new URL(window.location.href)
    const shareUrl = `${currentUrl.origin}/dashboard?tab=weekly&week=${currentWeek.toISOString().split("T")[0]}`

    navigator.clipboard.writeText(shareUrl).then(() => {
      // You could add a toast notification here
      console.log("Link copied to clipboard!")
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isCurrentWeek() ? "Total Hours This Week" : "Total Hours Selected Week"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={createShareableLink}
              className="h-6 w-6 p-0 hover:bg-gray-100"
              title="Copy shareable link"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHoursForChart(totalHours)}</div>
          <p className="text-xs text-muted-foreground">
            Target: {targetHours}h (
            {getWeekStart(currentWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {getWeekEnd(currentWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average per Weekday</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHoursForChart(avgHoursPerDay)}</div>
          <p className="text-xs text-muted-foreground">Target: 8h per weekday (Mon-Fri)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeProjects}</div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {topProject ? `${topProject.name} is top project` : "No projects"}
            </p>
            {topProject && onViewProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewProject(topProject.name)}
                className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedTasks}</div>
          <p className="text-xs text-muted-foreground">Last 3 days</p>
        </CardContent>
      </Card>
    </div>
  )
}
