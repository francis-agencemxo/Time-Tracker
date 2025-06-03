"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw, Loader2 } from "lucide-react"
import type { StatsData, ProjectUrl } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectUrlsViewProps {
  projectUrls: ProjectUrl[]
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  onCreateUrl: (formData: { project: string; url: string; description: string }) => Promise<void>
  onUpdateUrl: (id: string, formData: { project: string; url: string; description: string }) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export function ProjectUrlsView({
  projectUrls,
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
  onRefresh,
}: ProjectUrlsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUrl, setEditingUrl] = useState<ProjectUrl | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    project: "",
    url: "",
    description: "",
  })

  const { getProjectTotals, getProjectChartData } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)
  const projectNames = getProjectTotals().map((project) => project.name)
  const projectData = getProjectChartData()

  // Helper functions for project URLs
  const getGroupedProjectUrls = () => {
    const grouped: { [project: string]: ProjectUrl[] } = {}

    projectUrls.forEach((url) => {
      if (!grouped[url.project]) {
        grouped[url.project] = []
      }
      grouped[url.project].push(url)
    })

    return grouped
  }

  const getFilteredProjects = () => {
    const grouped = getGroupedProjectUrls()

    if (!searchQuery.trim()) {
      return Object.entries(grouped)
    }

    const query = searchQuery.toLowerCase()
    return Object.entries(grouped).filter(([projectName, urls]) => {
      return (
        projectName.toLowerCase().includes(query) ||
        urls.some((url) => url.url.toLowerCase().includes(query) || url.description.toLowerCase().includes(query))
      )
    })
  }

  const getPaginatedProjects = () => {
    const filtered = getFilteredProjects()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    return {
      projects: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalItems: filtered.length,
    }
  }

  const handleEditUrl = (url: ProjectUrl) => {
    setEditingUrl(url)
    setFormData({
      project: url.project,
      url: url.url,
      description: url.description,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      project: "",
      url: "",
      description: "",
    })
  }

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingUrl(null)
      resetForm()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUrl) {
        await onUpdateUrl(editingUrl.id, formData)
      } else {
        await onCreateUrl(formData)
      }
      setIsDialogOpen(false)
      resetForm()
      setEditingUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      await onDeleteUrl(id)
    } finally {
      setLoading(false)
    }
  }

  const { projects, totalPages, totalItems } = getPaginatedProjects()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project URLs</CardTitle>
            <CardDescription>Manage URLs associated with each project</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingUrl ? "Edit Project URL" : "Add Project URL"}</DialogTitle>
                <DialogDescription>
                  {editingUrl
                    ? "Update the URL details for this project."
                    : "Add a new URL to associate with a project."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="project" className="text-right">
                      Project
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.project}
                        onValueChange={(value) => setFormData({ ...formData, project: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="url" className="text-right">
                      URL
                    </Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="col-span-3"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="col-span-3"
                      placeholder="Project documentation, GitHub repo, etc."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingUrl ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Filter */}
        <div className="mb-6">
          <Input
            placeholder="Search projects, URLs, or descriptions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-4 pr-4"
          />
        </div>

        {projectUrls.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-gray-50">
            <p className="text-gray-500 mb-4">No project URLs have been added yet.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First URL
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {searchQuery ? (
                  <>
                    Found {totalItems} project{totalItems !== 1 ? "s" : ""} matching "{searchQuery}"
                  </>
                ) : (
                  <>
                    Showing {projects.length} of {totalItems} projects
                  </>
                )}
              </p>
              <Button onClick={onRefresh} variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <p className="text-gray-500">No projects match your search criteria.</p>
              </div>
            ) : (
              <>
                {/* Project Groups */}
                <div className="space-y-4">
                  {projects.map(([projectName, urls]) => (
                    <Card key={projectName} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: projectData.find((p) => p.name === projectName)?.color || "#2D5A5A",
                              }}
                            />
                            <CardTitle className="text-lg">{projectName}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {urls.length} URL{urls.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {urls.map((url) => (
                            <div
                              key={url.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a
                                    href={url.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-600 hover:text-teal-800 font-medium truncate"
                                  >
                                    {url.url.length > 50 ? url.url.substring(0, 50) + "..." : url.url}
                                  </a>
                                  <ExternalLink className="h-3 w-3 text-teal-600 flex-shrink-0" />
                                </div>
                                {url.description && <p className="text-sm text-gray-600 truncate">{url.description}</p>}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUrl(url)}
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Edit</span>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(url.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <span className="sr-only">Delete</span>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      <div className="flex gap-1">
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
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t bg-gray-50 px-6 py-3">
        <p className="text-xs text-gray-500">Project URLs are stored on your local webservice at localhost:56000</p>
      </CardFooter>
    </Card>
  )
}
