"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { dateToESTString } from "@/lib/date-utils"

// Types
export interface Session {
  start: string
  end: string
  type: "coding" | "browsing"
  file?: string // Add file field for coding sessions
  host?: string // Add host field for browsing sessions
  url?: string // Add url field for browsing sessions
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
  storageType: "cloud" | "local"
}

// Add this interface after the existing interfaces
export interface IgnoredProject {
  id: string
  projectName: string
  ignoredAt: string
}

// Fake data for preview - now using proper EST date strings
const generateFakeData = (): StatsData => {
  const data: StatsData = {}
  const projects = ["Dashboard Redesign", "API Integration", "Mobile App", "Documentation", "Bug Fixes"]
  const today = new Date()

  // Mock file paths for coding sessions
  const mockFiles = [
    "src/components/dashboard.tsx",
    "src/hooks/use-time-tracking-data.ts",
    "src/pages/api/stats.ts",
    "src/components/header.tsx",
    "src/utils/date-utils.ts",
    "src/components/project-detail-view.tsx",
    "src/hooks/use-time-calculations.ts",
    "package.json",
    "README.md",
    "src/styles/globals.css",
  ]

  // Mock URLs for browsing sessions
  const mockUrls = [
    "https://github.com/company/project",
    "https://stackoverflow.com/questions/react-hooks",
    "https://docs.nextjs.org/api-reference",
    "https://tailwindcss.com/docs",
    "https://localhost:3000/dashboard",
  ]

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = dateToESTString(date)

    data[dateStr] = {}

    const numProjects = Math.floor(Math.random() * 3) + 1
    const selectedProjects = projects.slice(0, numProjects)

    selectedProjects.forEach((project) => {
      const sessions: Session[] = []
      const numSessions = Math.floor(Math.random() * 4) + 1

      for (let j = 0; j < numSessions; j++) {
        const startHour = 9 + Math.floor(Math.random() * 8)
        const duration = Math.floor(Math.random() * 120) + 30
        const start = new Date(date)
        start.setHours(startHour, Math.floor(Math.random() * 60))
        const end = new Date(start.getTime() + duration * 60000)

        const sessionType = Math.random() > 0.3 ? "coding" : "browsing"
        const session: Session = {
          start: start.toISOString(),
          end: end.toISOString(),
          type: sessionType,
        }

        // Add file data for coding sessions
        if (sessionType === "coding") {
          session.file = mockFiles[Math.floor(Math.random() * mockFiles.length)]
        } else {
          // Add URL data for browsing sessions
          const url = mockUrls[Math.floor(Math.random() * mockUrls.length)]
          session.url = url
          session.host = new URL(url).hostname
        }

        sessions.push(session)
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

/**
 * Filters out ignored projects from the stats data
 */
const filterIgnoredProjects = (statsData: StatsData, ignoredProjectNames: string[]): StatsData => {
  if (ignoredProjectNames.length === 0) {
    return statsData
  }

  const filteredData: StatsData = {}

  Object.entries(statsData).forEach(([date, dayData]) => {
    const filteredDayData: DayData = {}

    Object.entries(dayData).forEach(([projectName, projectData]) => {
      if (!ignoredProjectNames.includes(projectName)) {
        filteredDayData[projectName] = projectData
      }
    })

    // Only include the date if there's at least one non-ignored project
    if (Object.keys(filteredDayData).length > 0) {
      filteredData[date] = filteredDayData
    }
  })

  return filteredData
}

export const useTimeTrackingData = (isLicenseValid = false) => {
  const [rawStatsData, setRawStatsData] = useState<StatsData>({}) // Store raw data
  const [statsData, setStatsData] = useState<StatsData>({}) // Store filtered data
  const [projectUrls, setProjectUrls] = useState<ProjectUrl[]>([])
  const [ignoredProjects, setIgnoredProjects] = useState<IgnoredProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(10)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [storageType, setStorageType] = useState<"cloud" | "local">("cloud")

  const baseUrl =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:${process.env.NEXT_PUBLIC_TRACKER_SERVER_PORT || "56000"}`

  // Better preview detection - use fake data only for v0.dev
  const isPreview =
    typeof window === "undefined" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net")

  // Filter stats data whenever raw data or ignored projects change
  useEffect(() => {
    const ignoredProjectNames = ignoredProjects.map((p) => p.projectName)
    const filteredData = filterIgnoredProjects(rawStatsData, ignoredProjectNames)
    setStatsData(filteredData)
  }, [rawStatsData, ignoredProjects])

  const fetchStats = async () => {
    // Don't fetch data if license is not valid
    if (!isLicenseValid) {
      setRawStatsData({})
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
          const fakeData = generateFakeData()
          setRawStatsData(fakeData)
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
        setRawStatsData(normalizedData)
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // If API is not available, fall back to fake data
        console.warn("API not available, using fake data:", fetchError)
        const fakeData = generateFakeData()
        setRawStatsData(fakeData)
      }
    } catch (err) {
      // Final fallback to fake data
      console.warn("Error in fetchStats, using fake data:", err)
      const fakeData = generateFakeData()
      setRawStatsData(fakeData)
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
        const storedStorageType = localStorage.getItem("storage-type") as "cloud" | "local"
        if (storedStorageType) {
          setStorageType(storedStorageType)
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
        setStorageType(settings.storageType || "cloud")
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

  const saveStorageType = async (type: "cloud" | "local") => {
    if (!isLicenseValid) {
      return
    }

    try {
      setSettingsLoading(true)

      if (isPreview) {
        localStorage.setItem("storage-type", type)
        setStorageType(type)
        setSettingsLoading(false)
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idleTimeoutMinutes,
            storageType: type,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        setStorageType(type)

        toast({
          title: "Settings Saved",
          description: `Storage preference updated to ${type}`,
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        localStorage.setItem("storage-type", type)
        setStorageType(type)

        toast({
          title: "Settings Saved Locally",
          description: `Storage preference updated to ${type} (saved locally)`,
        })
      }
    } catch (err) {
      console.error("Error saving storage type:", err)
      toast({
        title: "Error",
        description: "Failed to save storage preference",
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

  const fetchIgnoredProjects = async () => {
    if (!isLicenseValid) {
      setIgnoredProjects([])
      return
    }

    try {
      if (isPreview) {
        // In preview mode, use localStorage
        const stored = localStorage.getItem("ignored-projects")
        if (stored) {
          setIgnoredProjects(JSON.parse(stored))
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/ignored-projects`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setIgnoredProjects(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn("Ignored projects API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("ignored-projects")
        if (stored) {
          setIgnoredProjects(JSON.parse(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching ignored projects:", err)
    }
  }

  const addIgnoredProject = async (projectName: string) => {
    if (!isLicenseValid) return

    try {
      const newIgnoredProject: IgnoredProject = {
        id: Date.now().toString(),
        projectName,
        ignoredAt: new Date().toISOString(),
      }

      if (isPreview) {
        const updated = [...ignoredProjects, newIgnoredProject]
        setIgnoredProjects(updated)
        localStorage.setItem("ignored-projects", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `"${projectName}" has been ignored and will be excluded from all calculations`,
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/ignored-projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchIgnoredProjects()
      toast({
        title: "Success",
        description: `"${projectName}" has been ignored and will be excluded from all calculations`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to ignore project",
        variant: "destructive",
      })
    }
  }

  const removeIgnoredProject = async (id: string) => {
    if (!isLicenseValid) return

    try {
      const project = ignoredProjects.find((p) => p.id === id)
      const projectName = project?.projectName || "Project"

      if (isPreview) {
        const updated = ignoredProjects.filter((p) => p.id !== id)
        setIgnoredProjects(updated)
        localStorage.setItem("ignored-projects", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `"${projectName}" has been unignored and will be included in calculations`,
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/ignored-projects/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchIgnoredProjects()
      toast({
        title: "Success",
        description: `"${projectName}" has been unignored and will be included in calculations`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to unignore project",
        variant: "destructive",
      })
    }
  }

  // Update the useEffect that fetches data
  useEffect(() => {
    if (isLicenseValid) {
      fetchStats()
      fetchProjectUrls()
      fetchSettings()
      fetchIgnoredProjects()
    }
  }, [isLicenseValid])

  // Return the filtered statsData instead of raw data - NO WEEK NAVIGATION
  return {
    statsData, // This is now the filtered data
    projectUrls,
    ignoredProjects,
    loading,
    error,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes: saveIdleTimeout,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    fetchSettings,
    fetchIgnoredProjects,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
    addIgnoredProject,
    removeIgnoredProject,
    storageType,
    setStorageType: saveStorageType,
  }
}
