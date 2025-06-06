"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WeekNavigationProps {
  currentWeek: Date
  onNavigateWeek: (direction: "prev" | "next" | "current") => void
}

export function WeekNavigation({ currentWeek, onNavigateWeek }: WeekNavigationProps) {
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const getWeekEnd = (date: Date) => {
    const weekStart = getWeekStart(date)
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
  }

  const isCurrentWeek = () => {
    const now = new Date()
    const weekStart = getWeekStart(currentWeek)
    const currentWeekStart = getWeekStart(now)
    return weekStart.getTime() === currentWeekStart.getTime()
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => onNavigateWeek("prev")}
              variant="outline"
              size="sm"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              ← Previous Week
            </Button>
            <div className="text-center">
              <div className="text-lg font-semibold text-teal-800">
                {getWeekStart(currentWeek).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {getWeekEnd(currentWeek).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-gray-600">
                {isCurrentWeek()
                  ? "Current Week"
                  : "Week of " +
                    getWeekStart(currentWeek).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
              </div>
            </div>
            <Button
              onClick={() => onNavigateWeek("next")}
              variant="outline"
              size="sm"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
              disabled={isCurrentWeek()}
            >
              Next Week →
            </Button>
          </div>
          {!isCurrentWeek() && (
            <Button
              onClick={() => onNavigateWeek("current")}
              variant="default"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              Back to Current Week
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
