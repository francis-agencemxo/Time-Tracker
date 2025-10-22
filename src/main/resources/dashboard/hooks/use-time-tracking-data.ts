"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { dateToESTString } from "@/lib/date-utils"
import { getWrikeClient, type WrikeProject } from "@/lib/wrike-api"

// Types
export interface Session {
  id?: number
  start: string
  end: string
  type: "coding" | "browsing" | "meeting"
  file?: string // Add file field for coding sessions
  host?: string // Add host field for browsing sessions or meeting title for meetings
  url?: string // Add url field for browsing/meeting sessions
  meetingTitle?: string
  sessionIds?: number[]
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

export interface ProjectCustomName {
  id: string
  projectName: string
  customName: string
  updatedAt: string
}

export interface ProjectClient {
  id: string
  projectName: string
  clientName: string
  updatedAt: string
}

export interface WrikeProjectMapping {
  id: string
  projectName: string
  wrikeProjectId: string
  wrikeProjectTitle: string
  wrikePermalink: string
  createdAt: string
}

export interface Commit {
  id: string
  project: string
  commitHash: string
  commitMessage: string
  branch?: string
  authorName?: string
  authorEmail?: string
  commitTime: string
  filesChanged: number
  linesAdded: number
  linesDeleted: number
  createdAt: string
}

// Fake data for preview - now using proper EST date strings
const generateFakeData = (): StatsData => {
  const data: StatsData = {}
  const projects = ["Dashboard Redesign", "API Integration", "Mobile App", "Documentation", "Bug Fixes"]
  const today = new Date()
  let sessionIdCounter = 1

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

        const randomValue = Math.random()
        const sessionType = randomValue > 0.6 ? "coding" : randomValue > 0.3 ? "browsing" : "meeting"
        const sessionId = sessionIdCounter++
        const session: Session = {
          id: sessionId,
          start: start.toISOString(),
          end: end.toISOString(),
          type: sessionType,
          sessionIds: [sessionId],
        }

        // Add file data for coding sessions
        if (sessionType === "coding") {
          session.file = mockFiles[Math.floor(Math.random() * mockFiles.length)]
        } else if (sessionType === "browsing") {
          // Add URL data for browsing sessions
          const url = mockUrls[Math.floor(Math.random() * mockUrls.length)]
          session.url = url
          session.host = new URL(url).hostname
        } else {
          // Meeting session
          const meetingNames = ["Daily Standup", "Sprint Planning", "Client Review", "Design Sync", "Retrospective"]
          const meetingName = meetingNames[Math.floor(Math.random() * meetingNames.length)]
          session.url = `https://meet.google.com/${Math.random().toString(36).substring(2, 12)}`
          session.host = meetingName
          session.meetingTitle = meetingName
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

    const normalizedDay: DayData = {}

    Object.entries(dayData).forEach(([projectName, projectData]) => {
      const normalizedSessions = projectData.sessions.map((session) => {
        const sessionIds =
          session.sessionIds && session.sessionIds.length > 0
            ? session.sessionIds
            : typeof session.id === "number"
              ? [session.id]
              : []

        const normalizedSession: Session = {
          ...session,
          sessionIds,
        }

        if (
          normalizedSession.type === "meeting" &&
          normalizedSession.host &&
          !normalizedSession.meetingTitle
        ) {
          normalizedSession.meetingTitle = normalizedSession.host
        }

        return normalizedSession
      })

      normalizedDay[projectName] = {
        ...projectData,
        sessions: normalizedSessions,
      }
    })

    normalizedData[normalizedDate] = normalizedDay
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

const calculateSessionDurationSeconds = (session: Session): number => {
  return Math.max(0, (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000)
}

const sessionHasId = (session: Session): boolean => typeof session.id === "number" && !Number.isNaN(session.id)

const extractSessionIds = (session: Session): number[] => {
  if (session.sessionIds && session.sessionIds.length > 0) {
    return session.sessionIds
  }
  if (sessionHasId(session)) {
    return [session.id]
  }
  return []
}

const reassignSessionsInStatsData = (statsData: StatsData, sessionIds: number[], newProject: string): StatsData => {
  if (sessionIds.length === 0) {
    return statsData
  }

  const idsToMove = new Set(sessionIds)
  const updatedData: StatsData = {}

  Object.entries(statsData).forEach(([date, dayData]) => {
    const newDayData: DayData = {}
    let movedSessions: Session[] = []

    Object.entries(dayData).forEach(([projectName, projectData]) => {
      const remainingSessions: Session[] = []
      const sessionsToMove: Session[] = []

      projectData.sessions.forEach((session) => {
        const ids = extractSessionIds(session)
        const shouldMove = ids.some((id) => idsToMove.has(id))
        if (shouldMove) {
          sessionsToMove.push({ ...session })
        } else {
          remainingSessions.push({ ...session })
        }
      })

      if (remainingSessions.length > 0) {
        newDayData[projectName] = {
          duration: remainingSessions.reduce((total, session) => total + calculateSessionDurationSeconds(session), 0),
          sessions: remainingSessions,
        }
      }

      if (sessionsToMove.length > 0) {
        movedSessions = movedSessions.concat(sessionsToMove)
      }
    })

    if (movedSessions.length > 0) {
      const existingTarget = newDayData[newProject]
      const combinedSessions = [
        ...(existingTarget ? existingTarget.sessions : []),
        ...movedSessions.map((session) => ({ ...session })),
      ]

      newDayData[newProject] = {
        duration: combinedSessions.reduce((total, session) => total + calculateSessionDurationSeconds(session), 0),
        sessions: combinedSessions,
      }
    }

    if (Object.keys(newDayData).length > 0) {
      updatedData[date] = newDayData
    }
  })

  return updatedData
}

export const useTimeTrackingData = (isLicenseValid = false, isDemoLicense = false) => {
  const [rawStatsData, setRawStatsData] = useState<StatsData>({}) // Store raw data
  const [statsData, setStatsData] = useState<StatsData>({}) // Store filtered data
  const [projectUrls, setProjectUrls] = useState<ProjectUrl[]>([])
  const [ignoredProjects, setIgnoredProjects] = useState<IgnoredProject[]>([])
  const [projectCustomNames, setProjectCustomNames] = useState<ProjectCustomName[]>([])
  const [projectClients, setProjectClients] = useState<ProjectClient[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [wrikeProjects, setWrikeProjects] = useState<WrikeProject[]>([])
  const [wrikeProjectMappings, setWrikeProjectMappings] = useState<WrikeProjectMapping[]>([])
  const [wrikeProjectsLoading, setWrikeProjectsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(10)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [storageType, setStorageType] = useState<"cloud" | "local">("cloud")

  const baseUrl =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:${process.env.NEXT_PUBLIC_TRACKER_SERVER_PORT || "56000"}`

  // Better preview detection - use fake data for v0.dev or demo licenses
  const isPreview =
    typeof window === "undefined" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net") ||
    isDemoLicense

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

  const reassignSessionsProject = async (sessionIds: number[], projectName: string) => {
    if (!isLicenseValid) return

    const trimmedProject = projectName.trim()
    if (!trimmedProject) {
      toast({
        title: "Invalid project",
        description: "Please select a valid project name",
        variant: "destructive",
      })
      return
    }

    try {
      if (isPreview) {
        setRawStatsData((prev) => reassignSessionsInStatsData(prev, sessionIds, trimmedProject))
        toast({
          title: "Project updated",
          description: `Session reassigned to "${trimmedProject}"`,
        })
        return
      }

      const isSingleSession = sessionIds.length === 1
      const endpoint = isSingleSession
        ? `${baseUrl}/api/sessions/${sessionIds[0]}`
        : `${baseUrl}/api/sessions/reassign`

      const payload = isSingleSession
        ? { project: trimmedProject }
        : { project: trimmedProject, sessionIds }

      const response = await fetch(endpoint, {
        method: isSingleSession ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchStats()
      toast({
        title: "Project updated",
        description: `Session reassigned to "${trimmedProject}"`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update session project",
        variant: "destructive",
      })
      throw err
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

  const fetchProjectCustomNames = async () => {
    if (!isLicenseValid) {
      setProjectCustomNames([])
      return
    }

    try {
      if (isPreview) {
        const stored = localStorage.getItem("project-custom-names")
        if (stored) {
          setProjectCustomNames(JSON.parse(stored))
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/project-names`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setProjectCustomNames(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn("Project custom names API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("project-custom-names")
        if (stored) {
          setProjectCustomNames(JSON.parse(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching project custom names:", err)
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

  const saveProjectCustomName = async (projectName: string, customName: string) => {
    if (!isLicenseValid) return

    debugger;

    try {
      const existingCustomName = projectCustomNames.find((p) => p.projectName === projectName)

      if (isPreview) {
        let updated: ProjectCustomName[]
        if (existingCustomName) {
          updated = projectCustomNames.map((p) =>
            p.projectName === projectName ? { ...p, customName, updatedAt: new Date().toISOString() } : p,
          )
        } else {
          const newCustomName: ProjectCustomName = {
            id: Date.now().toString(),
            projectName,
            customName,
            updatedAt: new Date().toISOString(),
          }
          updated = [...projectCustomNames, newCustomName]
        }
        setProjectCustomNames(updated)
        localStorage.setItem("project-names", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `Custom name for "${projectName}" has been saved`,
        })
        return
      }

      const method = existingCustomName ? "PUT" : "POST"
      const url = existingCustomName
        ? `${baseUrl}/api/project-names/${existingCustomName.id}`
        : `${baseUrl}/api/project-names`

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName, customName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectCustomNames()
      toast({
        title: "Success",
        description: `Custom name for "${projectName}" has been saved`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save custom name",
        variant: "destructive",
      })
    }
  }

  const removeProjectCustomName = async (id: string) => {
    if (!isLicenseValid) return

    try {
      const customName = projectCustomNames.find((p) => p.id === id)
      const projectName = customName?.projectName || "Project"

      if (isPreview) {
        const updated = projectCustomNames.filter((p) => p.id !== id)
        setProjectCustomNames(updated)
        localStorage.setItem("project-custom-names", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `Custom name for "${projectName}" has been removed`,
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/project-names/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectCustomNames()
      toast({
        title: "Success",
        description: `Custom name for "${projectName}" has been removed`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove custom name",
        variant: "destructive",
      })
    }
  }

  const fetchProjectClients = async () => {
    if (!isLicenseValid) {
      setProjectClients([])
      return
    }

    try {
      if (isPreview) {
        const stored = localStorage.getItem("project-clients")
        if (stored) {
          setProjectClients(JSON.parse(stored))
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/project-clients`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setProjectClients(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn("Project clients API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("project-clients")
        if (stored) {
          setProjectClients(JSON.parse(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching project clients:", err)
    }
  }

  const saveProjectClient = async (projectName: string, clientName: string) => {
    if (!isLicenseValid) return

    try {
      const existingClient = projectClients.find((p) => p.projectName === projectName)

      if (isPreview) {
        let updated: ProjectClient[]
        if (existingClient) {
          updated = projectClients.map((p) =>
            p.projectName === projectName ? { ...p, clientName, updatedAt: new Date().toISOString() } : p,
          )
        } else {
          const newClient: ProjectClient = {
            id: Date.now().toString(),
            projectName,
            clientName,
            updatedAt: new Date().toISOString(),
          }
          updated = [...projectClients, newClient]
        }
        setProjectClients(updated)
        localStorage.setItem("project-clients", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `Client for "${projectName}" has been saved`,
        })
        return
      }

      const method = existingClient ? "PUT" : "POST"
      const url = existingClient
        ? `${baseUrl}/api/project-clients/${existingClient.id}`
        : `${baseUrl}/api/project-clients`

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName, clientName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectClients()
      toast({
        title: "Success",
        description: `Client for "${projectName}" has been saved`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save client",
        variant: "destructive",
      })
    }
  }

  const removeProjectClient = async (id: string) => {
    if (!isLicenseValid) return

    try {
      const client = projectClients.find((p) => p.id === id)
      const projectName = client?.projectName || "Project"

      if (isPreview) {
        const updated = projectClients.filter((p) => p.id !== id)
        setProjectClients(updated)
        localStorage.setItem("project-clients", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `Client for "${projectName}" has been removed`,
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/project-clients/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchProjectClients()
      toast({
        title: "Success",
        description: `Client for "${projectName}" has been removed`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove client",
        variant: "destructive",
      })
    }
  }

  const fetchCommits = async () => {
    if (!isLicenseValid) {
      setCommits([])
      return
    }

    try {
      if (isPreview) {
        const stored = localStorage.getItem("commits")
        if (stored) {
          setCommits(JSON.parse(stored))
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/commits`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setCommits(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn("Commits API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("commits")
        if (stored) {
          setCommits(JSON.parse(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching commits:", err)
    }
  }

  const fetchWrikeProjects = async (bearerToken: string) => {
    if (!isLicenseValid) {
      setWrikeProjects([])
      return
    }

    if (!bearerToken) {
      setWrikeProjects([])
      return
    }

    try {
      setWrikeProjectsLoading(true)
      setError(null)

      const wrikeClient = getWrikeClient(bearerToken)
      const projects = await wrikeClient.getProjects()
      setWrikeProjects(projects)
    } catch (err) {
      console.error("Error fetching Wrike projects:", err)
      setWrikeProjects([])
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch Wrike projects",
        variant: "destructive",
      })
    } finally {
      setWrikeProjectsLoading(false)
    }
  }

  const fetchWrikeProjectMappings = async () => {
    if (!isLicenseValid) {
      setWrikeProjectMappings([])
      return
    }

    try {
      if (isPreview) {
        const stored = localStorage.getItem("wrike-project-mappings")
        if (stored) {
          setWrikeProjectMappings(JSON.parse(stored))
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${baseUrl}/api/wrike-mappings`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setWrikeProjectMappings(data)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn("Wrike mappings API not available, using localStorage:", fetchError)
        const stored = localStorage.getItem("wrike-project-mappings")
        if (stored) {
          setWrikeProjectMappings(JSON.parse(stored))
        }
      }
    } catch (err) {
      console.warn("Error fetching Wrike project mappings:", err)
    }
  }

  const saveWrikeProjectMapping = async (projectName: string, wrikeProject: WrikeProject) => {
    if (!isLicenseValid) return

    try {
      const existingMapping = wrikeProjectMappings.find((m) => m.projectName === projectName)

      const newMapping: WrikeProjectMapping = {
        id: existingMapping?.id || Date.now().toString(),
        projectName,
        wrikeProjectId: wrikeProject.id,
        wrikeProjectTitle: wrikeProject.title,
        wrikePermalink: wrikeProject.permalink,
        createdAt: existingMapping?.createdAt || new Date().toISOString(),
      }

      if (isPreview) {
        let updated: WrikeProjectMapping[]
        if (existingMapping) {
          updated = wrikeProjectMappings.map((m) => (m.projectName === projectName ? newMapping : m))
        } else {
          updated = [...wrikeProjectMappings, newMapping]
        }
        setWrikeProjectMappings(updated)
        localStorage.setItem("wrike-project-mappings", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `"${projectName}" has been linked to Wrike project "${wrikeProject.title}"`,
        })
        return
      }

      const method = existingMapping ? "PUT" : "POST"
      const url = existingMapping
        ? `${baseUrl}/api/wrike-mappings/${existingMapping.id}`
        : `${baseUrl}/api/wrike-mappings`

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMapping),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchWrikeProjectMappings()
      toast({
        title: "Success",
        description: `"${projectName}" has been linked to Wrike project "${wrikeProject.title}"`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save Wrike project mapping",
        variant: "destructive",
      })
    }
  }

  const removeWrikeProjectMapping = async (projectName: string) => {
    if (!isLicenseValid) return

    try {
      const mapping = wrikeProjectMappings.find((m) => m.projectName === projectName)
      if (!mapping) return

      if (isPreview) {
        const updated = wrikeProjectMappings.filter((m) => m.projectName !== projectName)
        setWrikeProjectMappings(updated)
        localStorage.setItem("wrike-project-mappings", JSON.stringify(updated))
        toast({
          title: "Success",
          description: `Wrike link for "${projectName}" has been removed`,
        })
        return
      }

      const response = await fetch(`${baseUrl}/api/wrike-mappings/${mapping.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await fetchWrikeProjectMappings()
      toast({
        title: "Success",
        description: `Wrike link for "${projectName}" has been removed`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove Wrike project mapping",
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
      fetchProjectCustomNames()
      fetchProjectClients()
      fetchCommits()
      fetchWrikeProjectMappings()
    }
  }, [isLicenseValid])

  // Return the filtered statsData instead of raw data - NO WEEK NAVIGATION
  return {
    statsData, // This is now the filtered data
    projectUrls,
    ignoredProjects,
    projectCustomNames,
    projectClients,
    commits,
    wrikeProjects,
    wrikeProjectMappings,
    wrikeProjectsLoading,
    loading,
    error,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes: saveIdleTimeout,
    settingsLoading,
    fetchStats,
    fetchProjectUrls,
    fetchSettings,
    fetchIgnoredProjects,
    fetchProjectCustomNames,
    fetchProjectClients,
    fetchCommits,
    fetchWrikeProjects,
    fetchWrikeProjectMappings,
    saveWrikeProjectMapping,
    removeWrikeProjectMapping,
    createProjectUrl,
    updateProjectUrl,
    deleteProjectUrl,
    reassignSessionsProject,
    addIgnoredProject,
    removeIgnoredProject,
    storageType,
    setStorageType: saveStorageType,
    saveProjectCustomName,
    removeProjectCustomName,
    saveProjectClient,
    removeProjectClient,
  }
}
