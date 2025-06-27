"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

interface WrikeIntegrationSettings {
  apiToken: string
  autoSync: boolean
  syncInterval: number
  defaultBillable: boolean
  projectMapping: { [localProject: string]: string }
  taskMapping: { [sessionId: string]: string }
}

interface WrikeTask {
  id: string
  title: string
  status: string
  permalink: string
  projectId: string
  projectName: string
}

interface WrikeProject {
  id: string
  title: string
  status: string
  permalink: string
}

export const useWrikeIntegration = () => {
  const [settings, setSettings] = useState<WrikeIntegrationSettings>({
    apiToken: "",
    autoSync: false,
    syncInterval: 30,
    defaultBillable: true,
    projectMapping: {},
    taskMapping: {},
  })

  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<WrikeTask[]>([])
  const [projects, setProjects] = useState<WrikeProject[]>([])

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wrike-settings")
    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored)
        setSettings(parsedSettings)
        if (parsedSettings.apiToken) {
          testConnection(parsedSettings.apiToken)
        }
      } catch (error) {
        console.error("Failed to load Wrike settings:", error)
      }
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = (newSettings: WrikeIntegrationSettings) => {
    setSettings(newSettings)
    localStorage.setItem("wrike-settings", JSON.stringify(newSettings))
  }

  // Test API connection
  const testConnection = async (apiToken?: string) => {
    const token = apiToken || settings.apiToken
    if (!token) return false

    setLoading(true)
    try {
      // In a real implementation, this would call the Wrike API
      // For now, we'll simulate the connection
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Simulate success/failure based on token format
      if (token.length > 10) {
        setConnected(true)
        toast({
          title: "Connected",
          description: "Successfully connected to Wrike!",
        })
        return true
      } else {
        throw new Error("Invalid token")
      }
    } catch (error) {
      setConnected(false)
      toast({
        title: "Connection Failed",
        description: "Please check your API token",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  // Fetch Wrike data
  const fetchWrikeData = async () => {
    if (!connected) return

    setLoading(true)
    try {
      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock data
      const mockProjects: WrikeProject[] = [
        {
          id: "proj1",
          title: "Website Redesign",
          status: "Green",
          permalink: "https://www.wrike.com/workspace.htm#path=project&id=proj1",
        },
        {
          id: "proj2",
          title: "Mobile App Development",
          status: "Yellow",
          permalink: "https://www.wrike.com/workspace.htm#path=project&id=proj2",
        },
      ]

      const mockTasks: WrikeTask[] = [
        {
          id: "task1",
          title: "Implement user authentication",
          status: "Active",
          permalink: "https://www.wrike.com/workspace.htm#path=task&id=task1",
          projectId: "proj1",
          projectName: "Website Redesign",
        },
        {
          id: "task2",
          title: "Design dashboard mockups",
          status: "Active",
          permalink: "https://www.wrike.com/workspace.htm#path=task&id=task2",
          projectId: "proj1",
          projectName: "Website Redesign",
        },
      ]

      setProjects(mockProjects)
      setTasks(mockTasks)

      toast({
        title: "Data Synced",
        description: `Loaded ${mockProjects.length} projects and ${mockTasks.length} tasks`,
      })
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to fetch data from Wrike",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Sync time entries to Wrike
  const syncTimeEntries = async () => {
    if (!connected) return

    setLoading(true)
    try {
      // Simulate API call to sync time entries
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Sync Complete",
        description: "Successfully synced time entries to Wrike",
      })
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync time entries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    settings,
    saveSettings,
    connected,
    loading,
    tasks,
    projects,
    testConnection,
    fetchWrikeData,
    syncTimeEntries,
  }
}
