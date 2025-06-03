import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, TrendingUp, FolderOpen, Users } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface QuickStatsProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
}

export function QuickStats({ statsData, currentWeek, idleTimeoutMinutes }: QuickStatsProps) {
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
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

  const totalHours = getTotalHoursThisWeek()
  const targetHours = getTargetHoursThisWeek()
  const avgHoursPerDay = getAvgHoursPerDay()
  const activeProjects = getActiveProjects()
  const completedTasks = getCompletedTasks()
  const allProjects = getProjectTotals()

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isCurrentWeek() ? "Total Hours This Week" : "Total Hours Selected Week"}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
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
          <div className="text-2xl font-bold">{avgHoursPerDay.toFixed(1)}h</div>
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
          <p className="text-xs text-muted-foreground">{allProjects[0]?.name || "No projects"} is top project</p>
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
