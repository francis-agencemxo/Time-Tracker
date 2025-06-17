"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectHoursBreakdownProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[] // Add this prop
  onProjectSelect?: (projectName: string) => void
  limit?: number
}

export function ProjectHoursBreakdown({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [], // Add default value
  onProjectSelect,
  limit = 8,
}: ProjectHoursBreakdownProps) {
  const { getProjectChartData, getProjectTotals, formatHoursForChart } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
    ignoredProjects, // Pass ignored projects
  )
  const projectData = getProjectChartData()
  const allProjects = getProjectTotals()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Project Hours Breakdown</CardTitle>
        <CardDescription>Detailed view of time allocation</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {allProjects.slice(0, limit).map((project, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: projectData.find((p) => p.name === project.name)?.color || "#8884d8",
                  }}
                />
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold">{formatHoursForChart(project.hours)}</div>
                  <div className="text-sm text-gray-500">
                    {((project.duration / allProjects.reduce((sum, p) => sum + p.duration, 0)) * 100).toFixed(1)}%
                  </div>
                </div>
                {onProjectSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProjectSelect(project.name)}
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                )}
              </div>
            </div>
          ))}

          {allProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">No project data available for the selected week.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
