"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { dateToESTString } from "@/lib/date-utils"

// Types
export interface Session {
  start: string
  end: string
  type: "coding" | "browsing"
}

export interface ProjectData {
  duration: number
  sessions: Session[]
}

export interface DayData {
  [projectName: string]: ProjectData
}

export interface StatsData {
  [date: string]: DayData
}

// Update the ProjectUrl interface to make description optional
export interface ProjectUrl {
  id: string
  project: string
  url: string
  description?: string
}

export interface UserSettings {
  idleTimeoutMinutes: number
}

// Fake data for preview - now using proper EST date strings
const generateFakeData = (): StatsData => {
  const data: StatsData = {}
  const projects = ["Dashboard Redesign", "API Integration", "Mobile App", "Documentation", "Bug Fixes"]
  const today = new Date()

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // Use our EST date utility to ensure consistent date strings
    const dateStr = dateToESTString(date)

    data[dateStr] = {}

    // Add random projects for each day
    const numProjects = Math.floor(Math.random() * 3) + 1
    const selectedProjects = projects.slice(0, numProjects)

    selectedProjects.forEach((project) => {
      const sessions: Session[] = []
      const numSessions = Math.floor(Math.random() * 4) + 1

      for (let j = 0; j < numSessions; j++) {
        const startHour = 9 + Math.floor(Math.random() * 8)
        const duration = Math.floor(Math.random() * 120) + 30 // 30-150 minutes
        const start = new Date(date)
        start.setHours(startHour, Math.floor(Math.random() * 60))
        const end = new Date(start.getTime() + duration * 60000)

        sessions.push({
          start: start.toISOString(),
          end: end.toISOString(),
          type: Math.random() > 0.3 ? "coding" : "browsing",
        })
      }

      const totalDuration = sessions.reduce((sum, session) => {
        return sum + (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000
      }, 0)

      data[dateStr][project] = {
        duration: totalDuration,
        sessions,
      }
    })
  }

  return data
}

const generateFakeUrls = (): ProjectUrl[] => {
  return [
    {
      id: "1",
      project: "Dashboard Redesign",
      url: "https://github.com/company/dashboard-redesign",
      description: "Main repository for dashboard redesign project",
    },
    {
      id: "2",
      project: "Dashboard Redesign",
      url: "https://figma.com/dashboard-mockups",
      description: "Design mockups and wireframes",
    },
    {
      id: "3",
      project: "API Integration",
      url: "https://api-docs.company.com",
      description: "API documentation and endpoints",
    },
    {
      id: "4",
      project: "API Integration",
      url: "https://github.com/company/api-integration",
      description: "Integration code repository",
    },
    {
      id: "5",
      project: "Mobile App",
      url: "https://github.com/company/mobile-app",
      description: "React Native mobile application",
    },
    {
      id: "6",
      project: "Documentation",
      url: "https://docs.company.com",
      description: "Project documentation site",
    },
  ]
}

/**
 * Normalizes the stats data to ensure all dates are in EST format
 * This fixes any timezone issues from the API response
 */
const normalizeStatsData = (rawData: StatsData): StatsData => {
  const normalizedData: StatsData = {}

  Object.entries(rawData).forEach(([dateString, dayData]) => {
    // Ensure the date string is properly formatted for EST
    // If the API returns dates in different formats, normalize them here
    let normalizedDate = dateString

    // Handle various date formats that might come from the API
    if (dateString.includes("T")) {
      // If it's an ISO string, extract just the date part
      normalizedDate = dateString.split("T")[0]
    }

    // Validate the date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      console.warn(`Invalid date format received from API: ${dateString}`)
      return
    }

    normalizedData[normalizedDate] = dayData
  })

  return normalizedData
}

export const useTimeTrackingData = (isLicenseValid = false) => {
  const [statsData, setStatsData] = useState<StatsData>({})
  const [projectUrls, setProjectUrls] = useState<ProjectUrl[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(10)
  const [settingsLoading, setSettingsLoading] = useState(false)

  const baseUrl =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:${process.env.NEXT_PUBLIC_TRACKER_SERVER_PORT || "56000"}`

  // Better preview detection - use fake data only for v0.dev
  const isPreview =
    typeof window === "undefined" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net")

  const fetchStats = async () => {
    // Don't fetch data if license is not valid
    if (!isLicenseValid) {
      setStatsData({})
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Always use fake data in preview mode
      if (isPreview) {
        setTimeout(() => {
          setStatsData(generateFakeData())
          setLoading(false)
        }, 1000)
        return
      }

      // Try to fetch from real API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        const response = await fetch(`${baseUrl}/api/stats`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const rawData = await response.json()

        // Normalize the data to ensure consistent EST date handling
        const normalizedData = normalizeStatsData(rawData)
        setStatsData(normalizedData)
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // If API is not available, fall back to fake data
        console.warn("API not available, using fake data:", fetchError)
        setStatsData(generateFakeData())
      }
    } catch (err) {
      // Final fallback to fake data
      console.warn("Error in fetchStats, using fake data:", err)
      setStatsData(generateFakeData())
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectUrls = async () => {
    // Don't fetch URLs if license is not valid
    if (!isLicenseValid) {
      setProjectUrls([])
      return
    }

    try {
      setError(null)

      // Always use fake data in preview mode
      if (isPreview) {
        setProjectUrls(generateFakeUrls())
        return
      }

      // Try to fetch from real API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/urls`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setProjectUrls(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // If API is not available, fall back to fake data
        console.warn("API not available for URLs, using fake data:", fetchError)
        setProjectUrls(generateFakeUrls())
      }
    } catch (err) {
      console.warn("Error fetching project URLs, using fake data:", err)
      setProjectUrls(generateFakeUrls())
    }
  }

  const fetchSettings = async () => {
    // Don't fetch settings if license is not valid
    if (!isLicenseValid) {
      setIdleTimeoutMinutes(10) // Reset to default
      return
    }

    try {
      setSettingsLoading(true)

      // In preview mode, use localStorage as fallback
      if (isPreview) {
        const stored = localStorage.getItem("idle-timeout-minutes")
        if (stored) {
          setIdleTimeoutMinutes(Number(stored))
        }
        setSettingsLoading(false)
        return
      }

      // Try to fetch from real API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/settings`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const settings: UserSettings = await response.json()
        setIdleTimeoutMinutes(settings.idleTimeoutMinutes || 10)
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // If API is not available, fall back to localStorage
        console.warn("Settings API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("idle-timeout-minutes")
        if (stored) {
          setIdleTimeoutMinutes(Number(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching settings, using default:", err)
      // Keep default value of 10
    } finally {
      setSettingsLoading(false)
    }
  }

  const saveIdleTimeout = async (minutes: number) => {
    // Don't save settings if license is not valid
    if (!isLicenseValid) {
      return
    }

    try {
      setSettingsLoading(true)

      // In preview mode, save to localStorage
      if (isPreview) {
        localStorage.setItem("idle-timeout-minutes", minutes.toString())
        setIdleTimeoutMinutes(minutes)
        setSettingsLoading(false)
        return
      }

      // Try to save to real API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idleTimeoutMinutes: minutes,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Update local state
        setIdleTimeoutMinutes(minutes)

        toast({
          title: "Settings Saved",
          description: `Idle timeout updated to ${minutes} minutes`,
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // If API is not available, fall back to localStorage
        console.warn("Settings API not available, saving to localStorage:", fetchError)
        localStorage.setItem("idle-timeout-minutes", minutes.toString())
        setIdleTimeoutMinutes(minutes)

        toast({
          title: "Settings Saved Locally",
          description: `Idle timeout updated to ${minutes} minutes (saved locally)`,
        })
      }
    } catch (err) {
      console.error("Error saving settings:", err)
      toast({
        title: "Error",
        description: "Failed to save idle timeout setting",
        variant: "destructive",
      })
    } finally {
      setSettingsLoading(false)
    }
  }

  const createProjectUrl = async (formData: { project: string; url: string; description: string }) => {
    // Don't create URLs if license is not valid
    if (!isLicenseValid) {
      return
    }

    try {
      // Always simulate in preview mode
      if (isPreview) {
        const newUrl: ProjectUrl = {
          id: Date.now().toString(),
          project: formData.project,
          url: formData.url,
          description: formData.description,
        }
        setProjectUrls((prev) => [...prev, newUrl])
        toast({
          title: "Success",
          description: "Project URL has been created (preview mode)",
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectUrls()
      toast({
        title: "Success",
        description: "Project URL has been created",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create project URL",
        variant: "destructive",
      })
    }
  }

  const updateProjectUrl = async (id: string, formData: { project: string; url: string; description: string }) => {
    // Don't update URLs if license is not valid
    if (!isLicenseValid) {
      return
    }

    try {
      // Always simulate in preview mode
      if (isPreview) {
        setProjectUrls((prev) =>
          prev.map((url) =>
            url.id === id
              ? { ...url, project: formData.project, url: formData.url, description: formData.description }
              : url,
          ),
        )
        toast({
          title: "Success",
          description: "Project URL has been updated (preview mode)",
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/urls/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectUrls()
      toast({
        title: "Success",
        description: "Project URL has been updated",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update project URL",
        variant: "destructive",
      })
    }
  }

  const deleteProjectUrl = async (id: string) => {
    // Don't delete URLs if license is not valid
    if (!isLicenseValid) {
      return
    }

    try {
      // Always simulate in preview mode
      if (isPreview) {
        setProjectUrls((prev) => prev.filter((url) => url.id !== id))
        toast({
          title: "Success",
          description: "Project URL has been deleted (preview mode)",
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/urls/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectUrls()
      toast({
        title: "Success",
        description: "Project URL has been deleted",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete project URL",
        variant: "destructive",
      })
    }
  }

  const navigateWeek = (direction: "prev" | "next" | "current") => {
    if (direction === "current") {
      setCurrentWeek(new Date())
    } else {
      const newWeek = new Date(currentWeek)
      newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
      setCurrentWeek(newWeek)
    }
  }

  // Clear data when license becomes invalid
  useEffect(() => {
    if (!isLicenseValid) {
      setStatsData({})
      setProjectUrls([])
      setIdleTimeoutMinutes(10)
      setError(null)
      setLoading(false)
    }
  }, [isLicenseValid])

  // Only fetch data when license is valid
  useEffect(() => {
    if (isLicenseValid) {
      fetchStats()
      fetchProjectUrls()
      fetchSettings()
    }
  }, [isLicenseValid])

  return {
    statsData,
    projectUrls,
    loading,
    error,
    currentWeek,
    setCurrentWeek: navigateWeek,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes: saveIdleTimeout,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    fetchSettings,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
  }
}
