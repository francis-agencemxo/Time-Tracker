import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface RecentActivitiesProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
}

export function RecentActivities({ statsData, currentWeek, idleTimeoutMinutes }: RecentActivitiesProps) {
  const { getRecentActivities } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)
  const recentActivities = getRecentActivities()

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Your latest time entries and sessions</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div
                  className={`w-2 h-2 rounded-full ${activity.type === "coding" ? "bg-teal-600" : "bg-amber-600"}`}
                />
                <div>
                  <div className="font-medium">{activity.task}</div>
                  <div className="text-sm text-gray-500">{activity.project}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={activity.type === "coding" ? "default" : "secondary"}>{activity.type}</Badge>
                <div className="text-right">
                  <div className="font-medium">{activity.duration}</div>
                  <div className="text-sm text-gray-500">{activity.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
