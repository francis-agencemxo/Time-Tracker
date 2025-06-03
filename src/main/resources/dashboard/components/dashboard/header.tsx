"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, RefreshCw, Settings } from "lucide-react"

interface HeaderProps {
  idleTimeoutMinutes: number
  onIdleTimeoutChange: (minutes: number) => void
  onRefresh: () => void
}

export function Header({ idleTimeoutMinutes, onIdleTimeoutChange, onRefresh }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/mxo-logo.png" alt="MXO Logo" className="h-12 w-auto" />
        <div>
          <h1 className="text-3xl font-bold text-teal-800">Development Time Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor your development productivity and project progress</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Dashboard Settings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="idle-timeout" className="text-sm font-medium">
                    Idle Timeout: {idleTimeoutMinutes} minutes
                  </label>
                  <select
                    id="idle-timeout"
                    value={idleTimeoutMinutes}
                    onChange={(e) => onIdleTimeoutChange(Number(e.target.value))}
                    className="bg-white border rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  Sessions within {idleTimeoutMinutes} minutes of each other will be merged
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Badge variant="outline" className="px-3 py-1">
          <Calendar className="w-4 h-4 mr-1" />
          Live Data
        </Badge>
      </div>
    </div>
  )
}
