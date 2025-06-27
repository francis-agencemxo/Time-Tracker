"use client"

import { useState } from "react"

// Enhanced session interface with all the new fields
export interface EnhancedSession {
  id: string
  start: string
  end: string
  type: "coding" | "browsing" | "meeting" | "planning" | "debugging" | "testing" | "documentation"
  project: string
  file?: string
  url?: string
  host?: string

  // Enhanced metadata for precise logging
  task?: string
  description?: string
  tags?: string[]
  billable?: boolean
  difficulty?: 1 | 2 | 3 | 4 | 5
  productivity?: 1 | 2 | 3 | 4 | 5
  interruptions?: number
  mood?: "focused" | "distracted" | "energetic" | "tired" | "frustrated" | "satisfied"
  location?: "office" | "home" | "cafe" | "other"
  tools?: string[]
  blockers?: string
  achievements?: string
  nextSteps?: string

  // Automatic tracking metadata
  autoTracked?: boolean
  manuallyEnhanced?: boolean
  lastModified?: string
  modifiedBy?: "user" | "system"
}

export const useEnhancedTimeTracking = () => {
  const [enhancedSessions, setEnhancedSessions] = useState<EnhancedSession[]>([])

  const addEnhancedSession = async (session: Partial<EnhancedSession>) => {
    // Implementation for adding enhanced sessions
    const newSession: EnhancedSession = {
      id: Date.now().toString(),
      start: session.start || new Date().toISOString(),
      end: session.end || new Date().toISOString(),
      type: session.type || "coding",
      project: session.project || "",
      ...session,
      lastModified: new Date().toISOString(),
      modifiedBy: "user",
    }

    setEnhancedSessions((prev) => [...prev, newSession])

    // Here you would save to your backend
    return newSession
  }

  const updateSession = async (id: string, updates: Partial<EnhancedSession>) => {
    setEnhancedSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              ...updates,
              lastModified: new Date().toISOString(),
              modifiedBy: "user",
              manuallyEnhanced: true,
            }
          : session,
      ),
    )
  }

  return {
    enhancedSessions,
    addEnhancedSession,
    updateSession,
  }
}
