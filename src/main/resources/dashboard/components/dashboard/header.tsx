"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, RefreshCw, Settings, LogOut, Shield } from "lucide-react"
import { useLicenseValidation } from "@/hooks/use-license-validation"

interface HeaderProps {
  idleTimeoutMinutes: number
  onIdleTimeoutChange: (minutes: number) => void
  onRefresh: () => void
  onLogout?: () => void
}

export function Header({ idleTimeoutMinutes, onIdleTimeoutChange, onRefresh, onLogout }: HeaderProps) {
  const { getLicenseInfo } = useLicenseValidation()
  const licenseInfo = getLicenseInfo()

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
        {/* License Info */}
        {licenseInfo && (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <div className="text-right">
              <div className="text-xs font-medium text-teal-800">{licenseInfo.type}</div>
              <div className="text-xs text-gray-500">
                {licenseInfo.isDemo ? "Demo License" : licenseInfo.key.slice(-3)}
              </div>
            </div>
          </div>
        )}

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
