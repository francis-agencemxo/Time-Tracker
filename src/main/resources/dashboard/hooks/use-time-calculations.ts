import type { StatsData, Session } from "./use-time-tracking-data"
import {
  formatDateInEST,
  formatDateShort,
  formatDateLong,
  getDayName,
  dateToESTString,
  createESTDate,
} from "@/lib/date-utils"

export const useTimeCalculations = (statsData: StatsData, currentWeek: Date, idleTimeoutMinutes: number) => {
  // Week navigation helpers
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

  const getWeekDates = (weekStart: Date) => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
      // Use our EST date utility for consistent date strings
      dates.push(dateToESTString(date))
    }
    return dates
  }

  const getCurrentWeekData = () => {
    const weekStart = getWeekStart(currentWeek)
    const weekDates = getWeekDates(weekStart)

    const weekData: StatsData = {}
    weekDates.forEach((date) => {
      if (statsData[date]) {
        weekData[date] = statsData[date]
      }
    })

    return weekData
  }

  const isCurrentWeek = () => {
    const now = new Date()
    const weekStart = getWeekStart(currentWeek)
    const currentWeekStart = getWeekStart(now)
    return weekStart.getTime() === currentWeekStart.getTime()
  }

  // Helper function to get target hours based on day of week
  const getTargetHoursForDate = (dateString: string): number => {
    const date = createESTDate(dateString)
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Monday (1) through Friday (5) = 8 hours
    // Saturday (6) and Sunday (0) = 0 hours
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 8
    }
    return 0
  }

  // Helper functions to process the data
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // New function to format hours for charts (e.g., "2h38" format)
  const formatHoursForChart = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)

    if (wholeHours === 0 && minutes === 0) {
      return "0h00"
    }

    if (minutes === 0) {
      return `${wholeHours}h00`
    }

    return `${wholeHours}h${minutes.toString().padStart(2, "0")}`
  }

  const mergeSessions = (sessions: Session[]): Session[] => {
    if (sessions.length === 0) return sessions

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    const mergedSessions: Session[] = []
    let currentSession = { ...sortedSessions[0] }

    for (let i = 1; i < sortedSessions.length; i++) {
      const session = sortedSessions[i]
      const currentEnd = new Date(currentSession.end).getTime()
      const sessionStart = new Date(session.start).getTime()
      const timeDiff = sessionStart - currentEnd

      // If sessions are within the idle timeout (in ms) and same type, merge them
      if (timeDiff <= idleTimeoutMinutes * 60 * 1000 && currentSession.type === session.type) {
        currentSession.end = session.end
      } else {
        mergedSessions.push(currentSession)
        currentSession = { ...session }
      }
    }

    mergedSessions.push(currentSession)
    return mergedSessions
  }

  // Get all sessions for a day, merged based on idle timeout
  const getMergedSessionsForDay = (dayData: { [key: string]: any }): Session[] => {
    const allSessions: Session[] = []

    // Collect all sessions from all projects
    Object.values(dayData).forEach((projectData) => {
      allSessions.push(...projectData.sessions)
    })

    // Sort and merge sessions
    return mergeSessions(allSessions)
  }

  // Get merged sessions for a specific project on a specific day
  const getMergedSessionsForProjectDay = (projectData: any): Session[] => {
    return mergeSessions(projectData.sessions)
  }

  // Calculate total duration from merged sessions
  const calculateMergedDuration = (sessions: Session[]): number => {
    return sessions.reduce((total, session) => {
      return total + (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000
    }, 0)
  }

  // Get project totals using merged sessions
  const getProjectTotals = () => {
    const projectTotals: { [key: string]: number } = {}
    const weekData = getCurrentWeekData()

    Object.entries(weekData).forEach(([date, dayData]) => {
      Object.entries(dayData).forEach(([projectName, projectData]) => {
        // Use merged sessions for each project
        const mergedSessions = getMergedSessionsForProjectDay(projectData)
        const duration = calculateMergedDuration(mergedSessions)
        projectTotals[projectName] = (projectTotals[projectName] || 0) + duration
      })
    })

    return Object.entries(projectTotals)
      .map(([name, duration]) => ({ name, duration, hours: duration / 3600 }))
      .sort((a, b) => b.duration - a.duration)
  }

  const getWeeklyData = () => {
    const weekStart = getWeekStart(currentWeek)
    const weekDates = getWeekDates(weekStart)
    const weekData = getCurrentWeekData()

    return weekDates.map((date) => {
      const dayData = weekData[date] || {}

      // Get all sessions for the day and merge them based on idle timeout
      const mergedSessions = getMergedSessionsForDay(dayData)

      // Calculate total seconds from merged sessions
      const totalSeconds = calculateMergedDuration(mergedSessions)

      // Use our EST-aware day name function
      const dayName = getDayName(date)
      // Get target hours based on day of week
      const target = getTargetHoursForDate(date)

      return {
        day: dayName,
        date,
        hours: totalSeconds / 3600,
        target,
      }
    })
  }

  // New function for stacked weekly data
  const getStackedWeeklyData = () => {
    const weekStart = getWeekStart(currentWeek)
    const weekDates = getWeekDates(weekStart)
    const weekData = getCurrentWeekData()

    return weekDates.map((date) => {
      const dayData = weekData[date] || {}
      const dayName = getDayName(date)
      const target = getTargetHoursForDate(date)

      // Calculate hours per project for this day
      const projectHours: { [key: string]: number } = {}

      Object.entries(dayData).forEach(([projectName, projectData]) => {
        const mergedSessions = getMergedSessionsForProjectDay(projectData)
        const duration = calculateMergedDuration(mergedSessions)
        projectHours[projectName] = duration / 3600
      })

      return {
        day: dayName,
        date,
        target,
        ...projectHours,
      }
    })
  }

  // New function for weekly data for a specific project
  const getWeeklyDataForProject = (projectName: string) => {
    const weekStart = getWeekStart(currentWeek)
    const weekDates = getWeekDates(weekStart)
    const weekData = getCurrentWeekData()

    return weekDates.map((date) => {
      const dayData = weekData[date] || {}
      const projectData = dayData[projectName]
      const dayName = getDayName(date)

      let hours = 0
      if (projectData) {
        const mergedSessions = getMergedSessionsForProjectDay(projectData)
        const duration = calculateMergedDuration(mergedSessions)
        hours = duration / 3600
      }

      return {
        day: dayName,
        date,
        hours,
      }
    })
  }

  // New function to get all session details for a project
  const getProjectSessionDetails = (projectName: string) => {
    const sessions: (Session & { date: string })[] = []
    const weekData = getCurrentWeekData()

    Object.entries(weekData).forEach(([date, dayData]) => {
      if (dayData[projectName]) {
        const mergedSessions = getMergedSessionsForProjectDay(dayData[projectName])
        sessions.push(...mergedSessions.map((session) => ({ ...session, date })))
      }
    })

    return sessions.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  }

  const getRecentActivities = () => {
    const activities: Array<{
      id: string
      project: string
      task: string
      duration: string
      status: string
      date: string
      type: string
    }> = []

    const weekData = getCurrentWeekData()

    // Get sessions from current week
    Object.entries(weekData)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
      .forEach(([date, dayData]) => {
        Object.entries(dayData).forEach(([projectName, projectData]) => {
          const mergedSessions = getMergedSessionsForProjectDay(projectData)
          mergedSessions
            .slice(-3) // Last 3 merged sessions per project per day
            .forEach((session, index) => {
              const duration = new Date(session.end).getTime() - new Date(session.start).getTime()
              activities.push({
                id: `${date}-${projectName}-${index}`,
                project: projectName,
                task: `${session.type} session`,
                duration: formatDuration(duration / 1000),
                status: "completed",
                date,
                type: session.type,
              })
            })
        })
      })

    return activities.slice(0, 10) // Return top 10
  }

  const getTotalHoursThisWeek = () => {
    const weeklyData = getWeeklyData()
    return weeklyData.reduce((sum, day) => sum + day.hours, 0)
  }

  const getAvgHoursPerDay = () => {
    const weeklyData = getWeeklyData()
    // Only calculate average for weekdays (Mon-Fri)
    const weekdayData = weeklyData.filter((day) => day.target > 0)
    return weekdayData.length > 0 ? weekdayData.reduce((sum, day) => sum + day.hours, 0) / weekdayData.length : 0
  }

  const getTargetHoursThisWeek = () => {
    const weeklyData = getWeeklyData()
    return weeklyData.reduce((sum, day) => sum + day.target, 0)
  }

  const getActiveProjects = () => {
    return getProjectTotals().length
  }

  const getCompletedTasks = () => {
    return getRecentActivities().filter((activity) => activity.status === "completed").length
  }

  const getProjectChartData = () => {
    const projects = getProjectTotals().slice(0, 8) // Top 8 projects for better color variety
    const colors = [
      "#2D5A5A",
      "#4A7C7C",
      "#A67C5A",
      "#8B4513",
      "#D2B48C",
      "#5F8A8B",
      "#8FBC8F",
      "#CD853F",
      "#DEB887",
      "#F4A460",
    ]

    return projects.map((project, index) => ({
      name: project.name,
      hours: Number(project.hours.toFixed(1)),
      color: colors[index % colors.length],
    }))
  }

  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: number } = {}

    Object.entries(statsData).forEach(([date, dayData]) => {
      // Use our EST-aware date formatting
      const month = formatDateInEST(date, { month: "short" })

      // Calculate total duration for the day using merged sessions
      let totalDayDuration = 0
      Object.values(dayData).forEach((projectData) => {
        const mergedSessions = getMergedSessionsForProjectDay(projectData)
        totalDayDuration += calculateMergedDuration(mergedSessions)
      })

      monthlyData[month] = (monthlyData[month] || 0) + totalDayDuration
    })

    return Object.entries(monthlyData).map(([month, seconds]) => ({
      month,
      hours: Number((seconds / 3600).toFixed(1)),
    }))
  }

  const getProjectBreakdown = (projectName: string) => {
    const sessions: Session[] = []
    const weekData = getCurrentWeekData()

    Object.entries(weekData).forEach(([date, dayData]) => {
      if (dayData[projectName]) {
        const mergedSessions = getMergedSessionsForProjectDay(dayData[projectName])
        sessions.push(...mergedSessions.map((session) => ({ ...session, date })))
      }
    })

    return sessions.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  }

  const getDailyTotalsForProject = (projectName: string) => {
    const dailyData: { [date: string]: { duration: number; sessions: Session[] } } = {}
    const weekData = getCurrentWeekData()

    Object.entries(weekData).forEach(([date, dayData]) => {
      if (dayData[projectName]) {
        const mergedSessions = getMergedSessionsForProjectDay(dayData[projectName])
        const totalDuration = calculateMergedDuration(mergedSessions)

        dailyData[date] = {
          duration: totalDuration,
          sessions: mergedSessions,
        }
      }
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14) // Last 14 days
  }

  return {
    getWeekStart,
    getWeekEnd,
    getWeekDates,
    getCurrentWeekData,
    isCurrentWeek,
    formatDuration,
    formatHoursForChart,
    formatDateInEST,
    formatDateShort,
    formatDateLong,
    getTargetHoursForDate,
    mergeSessions,
    getMergedSessionsForDay,
    getMergedSessionsForProjectDay,
    calculateMergedDuration,
    getProjectTotals,
    getWeeklyData,
    getStackedWeeklyData,
    getWeeklyDataForProject,
    getProjectSessionDetails,
    getRecentActivities,
    getTotalHoursThisWeek,
    getAvgHoursPerDay,
    getTargetHoursThisWeek,
    getActiveProjects,
    getCompletedTasks,
    getProjectChartData,
    getMonthlyTrend,
    getProjectBreakdown,
    getDailyTotalsForProject,
  }
}
