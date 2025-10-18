"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, RefreshCw, Settings, LogOut, Shield, Loader2, Clock, HelpCircle } from "lucide-react"
import { useLicenseValidation } from "@/hooks/use-license-validation"

interface HeaderProps {
  idleTimeoutMinutes: number
  onIdleTimeoutChange: (minutes: number) => void
  storageType?: "cloud" | "local"
  onStorageTypeChange?: (type: "cloud" | "local") => void
  onRefresh: () => void
  onLogout?: () => void
  onRestartTour?: () => void
  settingsLoading?: boolean
}

export function Header({
  idleTimeoutMinutes,
  onIdleTimeoutChange,
  storageType,
  onStorageTypeChange,
  onRefresh,
  onLogout,
  onRestartTour,
  settingsLoading = false,
}: HeaderProps) {
  const { getLicenseInfo } = useLicenseValidation()
  const licenseInfo = getLicenseInfo()

  return (
    <div className="flex items-center justify-between" data-tour="header">
      <div className="flex items-center gap-4">
        {/* Custom Logo Design */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-800 rounded-lg flex items-center justify-center shadow-md">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-teal-800">Development Time Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor your development productivity and project progress</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* License Info */}
        {licenseInfo && (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <div className="text-right">
              <div className="text-xs font-medium text-teal-800">{licenseInfo.type}</div>
              <div className="text-xs text-gray-500">
                {licenseInfo.isDemo ? "Demo License" : `...${licenseInfo.key.slice(-6)}`}
              </div>
            </div>
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Settings className="w-4 h-4 mr-2" />
              Settings
              { /* settingsLoading && <Loader2 className="w-3 h-3 ml-2 animate-spin" /> */}
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
                    disabled={settingsLoading}
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

              {false && settingsLoading && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving settings...
                  </p>
                )}

              {licenseInfo && (
                <>
                  <hr />
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">License Information</h5>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{licenseInfo.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Key:</span>
                        <span className="font-mono">
                          {licenseInfo.isDemo ? "Demo" : `...${licenseInfo.key.slice(-6)}`}
                        </span>
                      </div>
                    </div>

                    {onLogout && (
                      <Button
                        onClick={onLogout}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {onRestartTour && (
          <Button
            onClick={onRestartTour}
            variant="outline"
            size="sm"
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
            title="Restart the guided tour"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>
        )}

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
          {licenseInfo?.isDemo ? "Demo Data" : "Live Data"}
        </Badge>
      </div>
    </div>
  )
}
