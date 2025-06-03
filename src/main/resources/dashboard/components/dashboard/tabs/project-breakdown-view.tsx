import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { formatDateInEST } from "@/lib/date-utils"

interface ProjectBreakdownViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
}

export function ProjectBreakdownView({ statsData, currentWeek, idleTimeoutMinutes }: ProjectBreakdownViewProps) {
  const { getProjectTotals, getProjectBreakdown, getDailyTotalsForProject, getProjectChartData, formatDuration } =
    useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

  const allProjects = getProjectTotals()
  const projectData = getProjectChartData()

  return (
    <div className="grid grid-cols-1 gap-6">
      {allProjects.map((project) => {
        const projectSessions = getProjectBreakdown(project.name)
        const dailyTotals = getDailyTotalsForProject(project.name)

        return (
          <Card key={project.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: projectData.find((p) => p.name === project.name)?.color || "#2D5A5A",
                      }}
                    />
                    {project.name}
                  </CardTitle>
                  <CardDescription>
                    Total: {formatDuration(project.duration)} • {projectSessions.length} sessions
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                  Export to Wrike
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700">Daily Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailyTotals.map((day) => (
                    <div key={day.date} className="p-3 border rounded-lg bg-stone-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{formatDateInEST(day.date)}</span>
                        <span className="text-sm font-bold text-teal-700">{formatDuration(day.duration)}</span>
                      </div>
                      <div className="space-y-1">
                        {day.sessions.map((session, sessionIndex) => (
                          <div key={sessionIndex} className="flex justify-between text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${session.type === "coding" ? "bg-teal-500" : "bg-amber-500"}`}
                              />
                              {new Date(session.start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -
                              {new Date(session.end).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>
                              {formatDuration(
                                (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Summary for Wrike */}
                <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h5 className="font-semibold text-sm text-teal-800 mb-3">Wrike Time Log Summary</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="ml-2 font-bold text-teal-800">{project.hours.toFixed(2)}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Billable Time:</span>
                      <span className="ml-2 font-bold text-teal-800">{(project.hours * 0.85).toFixed(2)}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Coding Sessions:</span>
                      <span className="ml-2 font-bold text-teal-800">
                        {projectSessions.filter((s) => s.type === "coding").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Research/Browsing:</span>
                      <span className="ml-2 font-bold text-teal-800">
                        {projectSessions.filter((s) => s.type === "browsing").length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="text-xs text-gray-500 mb-1">Copy for Wrike:</div>
                    <div className="text-sm font-mono text-gray-800">
                      {dailyTotals
                        .map((day) => `${formatDateInEST(day.date)}: ${formatDuration(day.duration)}`)
                        .join(" | ")}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
