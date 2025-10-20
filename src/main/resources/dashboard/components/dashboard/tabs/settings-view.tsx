"use client"

import { useState } from "react"
import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  EyeOff,
  Eye,
  Trash2,
  Plus,
  Search,
  Settings,
  FolderOpen,
  Clock as ClockIcon,
  Pencil,
  Tag,
  Save,
  X,
  Link2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import type { StatsData, IgnoredProject, ProjectCustomName, ProjectUrl, ProjectClient } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { toast } from "@/components/ui/use-toast"

interface SettingsViewProps {
  statsData: StatsData
  ignoredProjects: IgnoredProject[]
  projectCustomNames: ProjectCustomName[]
  projectClients: ProjectClient[]
  projectUrls: ProjectUrl[]
  currentWeek: Date
  idleTimeoutMinutes: number
  onIdleTimeoutChange: (minutes: number) => void
  onAddIgnoredProject: (projectName: string) => Promise<void>
  onRemoveIgnoredProject: (id: string) => Promise<void>
  onSaveProjectCustomName: (projectName: string, customName: string) => Promise<void>
  onRemoveProjectCustomName: (id: string) => Promise<void>
  onSaveProjectClient: (projectName: string, clientName: string) => Promise<void>
  onRemoveProjectClient: (id: string) => Promise<void>
  onCreateUrl: (formData: { project: string; url: string; description: string }) => Promise<void>
  onUpdateUrl: (id: string, formData: { project: string; url: string; description: string }) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
}

export function SettingsView({
  statsData,
  ignoredProjects,
  projectCustomNames,
  projectClients,
  projectUrls,
  currentWeek,
  idleTimeoutMinutes,
  onIdleTimeoutChange,
  onAddIgnoredProject,
  onRemoveIgnoredProject,
  onSaveProjectCustomName,
  onRemoveProjectCustomName,
  onSaveProjectClient,
  onRemoveProjectClient,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
}: SettingsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingCustomName, setEditingCustomName] = useState<string | null>(null)
  const [customNameInput, setCustomNameInput] = useState("")

  // Client management state
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [clientInput, setClientInput] = useState("")

  // URL management state
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false)
  const [editingUrl, setEditingUrl] = useState<ProjectUrl | null>(null)
  const [urlFormData, setUrlFormData] = useState({
    project: "",
    url: "",
    description: "",
  })

  // Inline URL add state
  const [addingUrlForProject, setAddingUrlForProject] = useState<string | null>(null)
  const [inlineUrlInput, setInlineUrlInput] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter state
  const [showIgnored, setShowIgnored] = useState(true)
  const [groupByClient, setGroupByClient] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // View mode state
  const [viewMode, setViewMode] = useState<"comfortable" | "compact">("comfortable")

  // Sorting state
  type SortField = "projectName" | "customName" | "client" | "lastWorkedOn"
  type SortDirection = "asc" | "desc"
  const [sortField, setSortField] = useState<SortField>("lastWorkedOn")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Active tab state - remember last visited tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("settings-active-tab") || "projects"
    }
    return "projects"
  })

  // Save active tab to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("settings-active-tab", activeTab)
    }
  }, [activeTab])

  const { getProjectTotals: getFilteredProjectTotals, formatDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
  )

  // Get all unique project names from all time data
  const getAllProjectNames = (): string[] => {
    const projectNames = new Set<string>()

    Object.values(statsData).forEach((dayData) => {
      Object.keys(dayData).forEach((projectName) => {
        projectNames.add(projectName)
      })
    })

    return Array.from(projectNames).sort()
  }

  // Get project totals for ALL time (not just current week)
  const getAllTimeProjectTotals = (): Array<{ name: string; duration: number; lastWorkedOn: number | null }> => {
    const projectDurations = new Map<string, number>()
    const projectLastWorked = new Map<string, number>()

    // Iterate through all days in statsData
    Object.values(statsData).forEach((dayData) => {
      Object.entries(dayData).forEach(([projectName, projectData]) => {
        if (!projectData.sessions) return

        // Calculate total duration for this project on this day
        let dayDuration = 0
        projectData.sessions.forEach((session: any) => {
          const startTime = new Date(session.start).getTime()
          const endTime = new Date(session.end).getTime()
          dayDuration += (endTime - startTime) / 1000 // duration in seconds

          // Track the most recent session end time
          const currentLastWorked = projectLastWorked.get(projectName) || 0
          if (endTime > currentLastWorked) {
            projectLastWorked.set(projectName, endTime)
          }
        })

        // Add to project total
        const currentTotal = projectDurations.get(projectName) || 0
        projectDurations.set(projectName, currentTotal + dayDuration)
      })
    })

    return Array.from(projectDurations.entries())
      .map(([name, duration]) => ({
        name,
        duration,
        lastWorkedOn: projectLastWorked.get(name) || null
      }))
      .sort((a, b) => b.duration - a.duration)
  }

  // Helper function to get display name for a project
  const getProjectDisplayName = (projectName: string): string => {
    const customName = projectCustomNames.find((p) => p.projectName === projectName)
    return customName ? customName.customName : projectName
  }

  // Helper function to get custom name object for a project
  const getProjectCustomName = (projectName: string): ProjectCustomName | undefined => {
    return projectCustomNames.find((p) => p.projectName === projectName)
  }

  // Helper function to get client for a project
  const getProjectClient = (projectName: string): ProjectClient | undefined => {
    return projectClients.find((p) => p.projectName === projectName)
  }

  const allProjectNames = getAllProjectNames()
  const allTimeProjects = getAllTimeProjectTotals()
  const ignoredProjectNames = ignoredProjects.map((p) => p.projectName)

  // Helper to get URLs for a specific project (defined early to avoid hoisting issues)
  const getProjectUrls = (projectName: string): ProjectUrl[] => {
    return projectUrls ? projectUrls.filter((url) => url.project === projectName) : []
  }

  // Create unified project list for table
  interface ProjectRow {
    name: string
    displayName: string
    duration: number
    lastWorkedOn: number | null
    isIgnored: boolean
    ignoredAt?: string
    urls: ProjectUrl[]
  }

  const getAllProjects = (): ProjectRow[] => {
    const projectMap = new Map<string, ProjectRow>()

    // Add all projects with their all-time duration and last worked on
    allTimeProjects.forEach((project) => {
      projectMap.set(project.name, {
        name: project.name,
        displayName: getProjectDisplayName(project.name),
        duration: project.duration,
        lastWorkedOn: project.lastWorkedOn,
        isIgnored: false,
        urls: getProjectUrls(project.name),
      })
    })

    // Add/update ignored projects
    ignoredProjects.forEach((project) => {
      const existing = projectMap.get(project.projectName)
      if (existing) {
        existing.isIgnored = true
        existing.ignoredAt = project.ignoredAt
      } else {
        projectMap.set(project.projectName, {
          name: project.projectName,
          displayName: getProjectDisplayName(project.projectName),
          duration: 0,
          lastWorkedOn: null,
          isIgnored: true,
          ignoredAt: project.ignoredAt,
          urls: getProjectUrls(project.projectName),
        })
      }
    })

    return Array.from(projectMap.values())
  }

  // Helper function to handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new field with default direction
      setSortField(field)
      setSortDirection(field === "lastWorkedOn" ? "desc" : "asc")
    }
  }

  // Filter and paginate projects
  const allProjects = getAllProjects()
  const filteredProjects = allProjects
    .filter((project) => {
      // Filter by ignored status
      if (!showIgnored && project.isIgnored) return false

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          project.name.toLowerCase().includes(query) ||
          project.displayName.toLowerCase().includes(query) ||
          project.urls.some((url) => url.url.toLowerCase().includes(query))
        )
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "projectName":
          comparison = a.name.localeCompare(b.name)
          break
        case "customName":
          comparison = a.displayName.localeCompare(b.displayName)
          break
        case "client":
          const clientA = getProjectClient(a.name)?.clientName || ""
          const clientB = getProjectClient(b.name)?.clientName || ""
          comparison = clientA.localeCompare(clientB)
          break
        case "lastWorkedOn":
          const timeA = a.lastWorkedOn || 0
          const timeB = b.lastWorkedOn || 0
          comparison = timeA - timeB
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

  // Group projects by client if enabled
  interface ClientGroup {
    clientName: string
    projects: ProjectRow[]
  }

  const groupedProjects: ClientGroup[] = React.useMemo(() => {
    if (!groupByClient) return []

    const groups = new Map<string, ProjectRow[]>()

    filteredProjects.forEach((project) => {
      const client = getProjectClient(project.name)
      const clientName = client?.clientName || "Unassigned"

      if (!groups.has(clientName)) {
        groups.set(clientName, [])
      }
      groups.get(clientName)!.push(project)
    })

    // Convert to array and sort by client name
    return Array.from(groups.entries())
      .map(([clientName, projects]) => ({ clientName, projects }))
      .sort((a, b) => {
        // "Unassigned" always last
        if (a.clientName === "Unassigned") return 1
        if (b.clientName === "Unassigned") return -1
        return a.clientName.localeCompare(b.clientName)
      })
  }, [filteredProjects, groupByClient, projectClients])

  const toggleGroupCollapse = (clientName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientName)) {
        newSet.delete(clientName)
      } else {
        newSet.add(clientName)
      }
      return newSet
    })
  }

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const prevSearchQuery = React.useRef(searchQuery)
  const prevShowIgnored = React.useRef(showIgnored)
  React.useEffect(() => {
    if (prevSearchQuery.current !== searchQuery || prevShowIgnored.current !== showIgnored) {
      setCurrentPage(1)
      prevSearchQuery.current = searchQuery
      prevShowIgnored.current = showIgnored
    }
  }, [searchQuery, showIgnored])

  const handleAddIgnoredProject = async () => {
    if (!newProjectName.trim()) return

    setLoading(true)
    try {
      await onAddIgnoredProject(newProjectName.trim())
      setNewProjectName("")
      setIsIgnoreDialogOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveIgnoredProject = async (id: string) => {
    setLoading(true)
    try {
      await onRemoveIgnoredProject(id)
    } finally {
      setLoading(false)
    }
  }

  const handleIgnoreProject = async (projectName: string) => {
    setLoading(true)
    try {
      await onAddIgnoredProject(projectName)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleIgnore = async (project: ProjectRow) => {
    if (project.isIgnored) {
      // Find the ignored project entry and remove it
      const ignoredProject = ignoredProjects.find((p) => p.projectName === project.name)
      if (ignoredProject) {
        await handleRemoveIgnoredProject(ignoredProject.id)
      }
    } else {
      await handleIgnoreProject(project.name)
    }
  }

  const handleEditCustomName = (projectName: string) => {
    const existingCustomName = getProjectCustomName(projectName)
    setEditingCustomName(projectName)
    setCustomNameInput(existingCustomName?.customName || "")
  }

  const handleSaveCustomName = async (projectName: string) => {
    if (!customNameInput.trim()) return

    setLoading(true)
    try {
      await onSaveProjectCustomName(projectName, customNameInput.trim())
      setEditingCustomName(null)
      setCustomNameInput("")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCustomName = async (projectName: string) => {
    const customName = getProjectCustomName(projectName)
    if (!customName) return

    setLoading(true)
    try {
      await onRemoveProjectCustomName(customName.id)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCustomName = () => {
    setEditingCustomName(null)
    setCustomNameInput("")
  }

  // Client management handlers
  const handleEditClient = (projectName: string) => {
    const existingClient = getProjectClient(projectName)
    setEditingClient(projectName)
    setClientInput(existingClient?.clientName || "")
  }

  const handleSaveClient = async (projectName: string) => {
    if (!clientInput.trim()) return

    setLoading(true)
    try {
      await onSaveProjectClient(projectName, clientInput.trim())
      setEditingClient(null)
      setClientInput("")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveClient = async (projectName: string) => {
    const client = getProjectClient(projectName)
    if (!client) return

    setLoading(true)
    try {
      await onRemoveProjectClient(client.id)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClient = () => {
    setEditingClient(null)
    setClientInput("")
  }

  // URL management handlers
  const handleEditUrl = (url: ProjectUrl) => {
    setEditingUrl(url)
    setUrlFormData({
      project: url.project,
      url: url.url,
      description: url.description || "",
    })
    setIsUrlDialogOpen(true)
  }

  const resetUrlForm = () => {
    setUrlFormData({
      project: "",
      url: "",
      description: "",
    })
  }

  const handleUrlDialogOpen = (open: boolean) => {
    setIsUrlDialogOpen(open)
    if (!open) {
      setEditingUrl(null)
      resetUrlForm()
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUrl) {
        await onUpdateUrl(editingUrl.id, urlFormData)
      } else {
        await onCreateUrl(urlFormData)
      }
      setIsUrlDialogOpen(false)
      resetUrlForm()
      setEditingUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUrl = async (id: string) => {
    setLoading(true)
    try {
      await onDeleteUrl(id)
    } finally {
      setLoading(false)
    }
  }

  // Inline URL add handlers
  const handleInlineUrlAdd = async (projectName: string) => {
    if (!inlineUrlInput.trim()) {
      setAddingUrlForProject(null)
      setInlineUrlInput("")
      return
    }

    setLoading(true)
    try {
      await onCreateUrl({
        project: projectName,
        url: inlineUrlInput.trim(),
        description: "",
      })
      setAddingUrlForProject(null)
      setInlineUrlInput("")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInlineUrl = () => {
    setAddingUrlForProject(null)
    setInlineUrlInput("")
  }

  const idleTimeoutOptions = [5, 10, 15, 20, 30]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <div>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage your time tracker preferences and projects</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <FolderOpen className="w-4 h-4 mr-1" />
                {allTimeProjects.length} Total Projects
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <EyeOff className="w-4 h-4 mr-1" />
                {ignoredProjects.length} Ignored
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Tag className="w-4 h-4 mr-1" />
                {projectCustomNames.length} Custom Names
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different settings sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="projects">
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="general">
            <ClockIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Idle Timeout</CardTitle>
              <CardDescription>
                Set the time after which inactivity will split sessions. This affects how sessions are grouped together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="idle-timeout" className="text-sm font-medium">
                  Idle timeout duration:
                </Label>
                <Select
                  value={idleTimeoutMinutes.toString()}
                  onValueChange={(value) => onIdleTimeoutChange(parseInt(value))}
                >
                  <SelectTrigger id="idle-timeout" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {idleTimeoutOptions.map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects CRUD Table */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>
                    Manage project visibility, custom names, and URLs
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {filteredProjects.length} of {allProjects.length} projects
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters and Search */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search projects or URLs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-ignored"
                    checked={showIgnored}
                    onCheckedChange={(checked) => setShowIgnored(checked as boolean)}
                  />
                  <Label htmlFor="show-ignored" className="text-sm cursor-pointer dark:text-gray-300">
                    Show ignored
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="group-by-client"
                    checked={groupByClient}
                    onCheckedChange={(checked) => setGroupByClient(checked as boolean)}
                  />
                  <Label htmlFor="group-by-client" className="text-sm cursor-pointer dark:text-gray-300">
                    Group by client
                  </Label>
                </div>
                <Select value={viewMode} onValueChange={(value: "comfortable" | "compact") => setViewMode(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projects Table */}
              <div className="rounded-md border dark:border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className={viewMode === "compact" ? "text-xs" : ""}>
                      <TableHead>
                        <button
                          onClick={() => handleSort("projectName")}
                          className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          Project Name
                          {sortField === "projectName" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("customName")}
                          className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          Custom Name
                          {sortField === "customName" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("client")}
                          className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          Client
                          {sortField === "client" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-40">
                        <button
                          onClick={() => handleSort("lastWorkedOn")}
                          className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          Last Worked On
                          {sortField === "lastWorkedOn" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>URLs</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-8">
                          {searchQuery ? "No projects match your search." : "No projects found."}
                        </TableCell>
                      </TableRow>
                    ) : groupByClient ? (
                      // Render grouped projects
                      groupedProjects.flatMap((group) => {
                        const isCollapsed = collapsedGroups.has(group.clientName)
                        const groupProjects = group.projects.slice(startIndex, endIndex)

                        return [
                          // Group header row
                          <TableRow
                            key={`group-${group.clientName}`}
                            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => toggleGroupCollapse(group.clientName)}
                          >
                            <TableCell colSpan={6} className="font-semibold dark:text-gray-200">
                              <div className="flex items-center gap-2">
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                                <span>
                                  {group.clientName} ({group.projects.length} project{group.projects.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>,
                          // Group projects (only if not collapsed)
                          ...(isCollapsed
                            ? []
                            : groupProjects.map((project) => (
                                <TableRow
                                  key={project.name}
                                  className={`${project.isIgnored ? "bg-orange-50 dark:bg-orange-950/20" : ""} ${viewMode === "compact" ? "text-xs" : ""}`}
                                >
                                  {/* Project Name */}
                                  <TableCell>
                                    <div className="flex items-center gap-2 pl-6">
                                      <div
                                        className={`w-2 h-2 rounded-full ${project.isIgnored ? "bg-orange-500 dark:bg-orange-400" : "bg-green-500 dark:bg-green-400"}`}
                                      ></div>
                                      <div>
                                        <div className="font-medium dark:text-gray-200">{project.name}</div>
                                        {project.isIgnored && project.ignoredAt && (
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Ignored {new Date(project.ignoredAt).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* Custom Name */}
                                  <TableCell>
                                    {editingCustomName === project.name ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={customNameInput}
                                          onChange={(e) => setCustomNameInput(e.target.value)}
                                          placeholder="Enter custom name"
                                          className="h-8"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleSaveCustomName(project.name)
                                            } else if (e.key === "Escape") {
                                              handleCancelCustomName()
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveCustomName(project.name)}
                                          disabled={!customNameInput.trim() || loading}
                                          className="h-8 px-2"
                                        >
                                          <Save className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelCustomName}
                                          className="h-8 px-2"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span
                                        className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded -mx-2 dark:text-gray-200"
                                        onClick={() => handleEditCustomName(project.name)}
                                        title="Click to edit custom name"
                                      >
                                        {getProjectCustomName(project.name)
                                          ? getProjectCustomName(project.name)?.customName
                                          : <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* Client */}
                                  <TableCell>
                                    {editingClient === project.name ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={clientInput}
                                          onChange={(e) => setClientInput(e.target.value)}
                                          placeholder="Enter client name"
                                          className="h-8"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleSaveClient(project.name)
                                            } else if (e.key === "Escape") {
                                              handleCancelClient()
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveClient(project.name)}
                                          disabled={!clientInput.trim() || loading}
                                          className="h-8 px-2"
                                        >
                                          <Save className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelClient}
                                          className="h-8 px-2"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span
                                        className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded -mx-2 dark:text-gray-200"
                                        onClick={() => handleEditClient(project.name)}
                                        title="Click to assign/edit client"
                                      >
                                        {getProjectClient(project.name)
                                          ? getProjectClient(project.name)?.clientName
                                          : <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* Last Worked On */}
                                  <TableCell>
                                    {project.lastWorkedOn ? (
                                      <div className="flex items-center gap-1 text-sm dark:text-gray-200">
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(project.lastWorkedOn).toLocaleDateString()}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                                    )}
                                  </TableCell>

                                  {/* URLs */}
                                  <TableCell>
                                    <div className="space-y-1">
                                      {project.urls.map((url) => (
                                        <div key={url.id} className="flex items-center gap-1 text-xs">
                                          <a
                                            href={url.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 truncate max-w-[200px] inline-block"
                                            title={url.url}
                                          >
                                            {url.url}
                                          </a>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditUrl(url)}
                                            className="h-5 w-5 p-0"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteUrl(url.id)}
                                            className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                                            disabled={loading}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                      {addingUrlForProject === project.name ? (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Input
                                            value={inlineUrlInput}
                                            onChange={(e) => setInlineUrlInput(e.target.value)}
                                            placeholder="https://example.com"
                                            className="h-7 text-xs"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleInlineUrlAdd(project.name)
                                              } else if (e.key === "Escape") {
                                                handleCancelInlineUrl()
                                              }
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleInlineUrlAdd(project.name)}
                                            disabled={!inlineUrlInput.trim() || loading}
                                            className="h-7 px-2"
                                          >
                                            <Save className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelInlineUrl}
                                            className="h-7 px-2"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : project.urls.length === 0 ? (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">No URLs</span>
                                      ) : null}
                                    </div>
                                  </TableCell>

                                  {/* Actions */}
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleToggleIgnore(project)}
                                        disabled={loading}
                                        className="h-7 px-2"
                                        title={project.isIgnored ? "Show project" : "Ignore project"}
                                      >
                                        {project.isIgnored ? (
                                          <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                        ) : (
                                          <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setAddingUrlForProject(project.name)
                                          setInlineUrlInput("")
                                        }}
                                        className="h-7 px-2 text-xs"
                                        title="Add URL"
                                        disabled={addingUrlForProject === project.name}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add URL
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))),
                        ]
                      })
                    ) : (
                      // Render flat list
                      paginatedProjects.map((project) => (
                        <TableRow
                          key={project.name}
                          className={`${project.isIgnored ? "bg-orange-50 dark:bg-orange-950/20" : ""} ${viewMode === "compact" ? "text-xs" : ""}`}
                        >
                          {/* Project Name */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${project.isIgnored ? "bg-orange-500 dark:bg-orange-400" : "bg-green-500 dark:bg-green-400"}`}
                              ></div>
                              <div>
                                <div className="font-medium dark:text-gray-200">{project.name}</div>
                                {project.isIgnored && project.ignoredAt && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Ignored {new Date(project.ignoredAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Custom Name */}
                          <TableCell>
                            {editingCustomName === project.name ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={customNameInput}
                                  onChange={(e) => setCustomNameInput(e.target.value)}
                                  placeholder="Enter custom name"
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveCustomName(project.name)
                                    } else if (e.key === "Escape") {
                                      handleCancelCustomName()
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCustomName(project.name)}
                                  disabled={!customNameInput.trim() || loading}
                                  className="h-8 px-2"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelCustomName}
                                  className="h-8 px-2"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded -mx-2 dark:text-gray-200"
                                onClick={() => handleEditCustomName(project.name)}
                                title="Click to edit custom name"
                              >
                                {getProjectCustomName(project.name)
                                  ? getProjectCustomName(project.name)?.customName
                                  : <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}
                              </span>
                            )}
                          </TableCell>

                          {/* Client */}
                          <TableCell>
                            {editingClient === project.name ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={clientInput}
                                  onChange={(e) => setClientInput(e.target.value)}
                                  placeholder="Enter client name"
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveClient(project.name)
                                    } else if (e.key === "Escape") {
                                      handleCancelClient()
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveClient(project.name)}
                                  disabled={!clientInput.trim() || loading}
                                  className="h-8 px-2"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelClient}
                                  className="h-8 px-2"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded -mx-2 dark:text-gray-200"
                                onClick={() => handleEditClient(project.name)}
                                title="Click to assign/edit client"
                              >
                                {getProjectClient(project.name)
                                  ? getProjectClient(project.name)?.clientName
                                  : <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}
                              </span>
                            )}
                          </TableCell>

                          {/* Last Worked On */}
                          <TableCell>
                            {project.lastWorkedOn ? (
                              <div className="flex items-center gap-1 text-sm dark:text-gray-200">
                                <ClockIcon className="w-3 h-3" />
                                {new Date(project.lastWorkedOn).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                            )}
                          </TableCell>

                          {/* URLs */}
                          <TableCell>
                            <div className="space-y-1">
                              {project.urls.map((url) => (
                                <div key={url.id} className="flex items-center gap-1 text-xs">
                                  <a
                                    href={url.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 truncate max-w-[200px] inline-block"
                                    title={url.url}
                                  >
                                    {url.url}
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUrl(url)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUrl(url.id)}
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {addingUrlForProject === project.name ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Input
                                    value={inlineUrlInput}
                                    onChange={(e) => setInlineUrlInput(e.target.value)}
                                    placeholder="https://example.com"
                                    className="h-7 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleInlineUrlAdd(project.name)
                                      } else if (e.key === "Escape") {
                                        handleCancelInlineUrl()
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleInlineUrlAdd(project.name)}
                                    disabled={!inlineUrlInput.trim() || loading}
                                    className="h-7 px-2"
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelInlineUrl}
                                    className="h-7 px-2"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : project.urls.length === 0 ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">No URLs</span>
                              ) : null}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleIgnore(project)}
                                disabled={loading}
                                className="h-7 px-2"
                                title={project.isIgnored ? "Show project" : "Ignore project"}
                              >
                                {project.isIgnored ? (
                                  <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddingUrlForProject(project.name)
                                  setInlineUrlInput("")
                                }}
                                className="h-7 px-2 text-xs"
                                title="Add URL"
                                disabled={addingUrlForProject === project.name}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add URL
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* URL Management Dialog */}
          <Dialog open={isUrlDialogOpen} onOpenChange={handleUrlDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingUrl ? "Edit Project URL" : "Add Project URL"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUrlSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="url-project" className="text-right font-medium">
                      Project
                    </label>
                    <div className="col-span-3">
                      <Select
                        value={urlFormData.project}
                        onValueChange={(value) => setUrlFormData({ ...urlFormData, project: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProjectNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {getProjectDisplayName(name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="url-input" className="text-right font-medium">
                      URL
                    </label>
                    <Input
                      id="url-input"
                      value={urlFormData.url}
                      onChange={(e) => setUrlFormData({ ...urlFormData, url: e.target.value })}
                      className="col-span-3"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleUrlDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingUrl ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
