"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimesheetView } from "./tabs/timesheet-view"
import { DailyDetailsSimple } from "./tabs/daily-details-simple"
import { SettingsView } from "./tabs/settings-view"
import { Calendar, Clock, Settings } from "lucide-react"
import type { StatsData, IgnoredProject, ProjectCustomName, ProjectUrl, ProjectClient, Commit } from "@/hooks/use-time-tracking-data"
import type { WrikeProject } from "@/lib/wrike-api"

interface DashboardTabsProps {
  statsData: StatsData
  ignoredProjects: IgnoredProject[]
  projectCustomNames: ProjectCustomName[]
  projectClients: ProjectClient[]
  projectUrls: ProjectUrl[]
  commits: Commit[]
  wrikeProjects: WrikeProject[]
  wrikeProjectsLoading: boolean
  wrikeProjectMappings: Array<{
    projectName: string
    wrikeProjectId: string
    wrikeProjectTitle: string
    wrikePermalink: string
  }>
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
  onReassignSessionsProject: (sessionIds: number[], projectName: string) => Promise<void>
  onFetchWrikeProjects: (bearerToken: string) => Promise<void>
  onSaveWrikeMapping: (projectName: string, wrikeProject: WrikeProject) => Promise<void>
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DashboardTabs({
  statsData,
  ignoredProjects,
  projectCustomNames,
  projectClients,
  projectUrls,
  commits,
  wrikeProjects,
  wrikeProjectsLoading,
  wrikeProjectMappings,
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
  onReassignSessionsProject,
  onFetchWrikeProjects,
  onSaveWrikeMapping,
  activeTab,
  onTabChange,
}: DashboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="timesheet" data-tour="timesheet-tab">
          <Calendar className="w-4 h-4 mr-2" />
          Weekly Timesheet
        </TabsTrigger>
        <TabsTrigger value="daily" data-tour="daily-details-tab">
          <Clock className="w-4 h-4 mr-2" />
          Daily Details
        </TabsTrigger>
        <TabsTrigger value="settings" data-tour="settings-tab">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timesheet">
        <TimesheetView
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          ignoredProjects={ignoredProjects.map((p) => p.projectName)}
          projectCustomNames={projectCustomNames}
          projectClients={projectClients}
          commits={commits}
          wrikeProjectMappings={wrikeProjectMappings}
          onReassignSessions={onReassignSessionsProject}
        />
      </TabsContent>

      <TabsContent value="daily">
        <DailyDetailsSimple
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          ignoredProjects={ignoredProjects.map((p) => p.projectName)}
        />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsView
          statsData={statsData}
          ignoredProjects={ignoredProjects}
          projectCustomNames={projectCustomNames}
          projectClients={projectClients}
          projectUrls={projectUrls}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onIdleTimeoutChange={onIdleTimeoutChange}
          onAddIgnoredProject={onAddIgnoredProject}
          onRemoveIgnoredProject={onRemoveIgnoredProject}
          onSaveProjectCustomName={onSaveProjectCustomName}
          onRemoveProjectCustomName={onRemoveProjectCustomName}
          onSaveProjectClient={onSaveProjectClient}
          onRemoveProjectClient={onRemoveProjectClient}
          onCreateUrl={onCreateUrl}
          onUpdateUrl={onUpdateUrl}
          onDeleteUrl={onDeleteUrl}
        />
      </TabsContent>
    </Tabs>
  )
}
