"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Shield, Key, CheckCircle, AlertCircle, Copy, Loader2, Globe, Clock } from "lucide-react"

interface LicenseValidationProps {
  onValidate: (licenseKey: string) => Promise<boolean>
}

// Fake license keys for testing
const DEMO_LICENSE_KEYS = ["MXO-DEV-2024-TRACK-001", "MXO-PRO-2024-TRACK-002", "MXO-ENT-2024-TRACK-003"]

export function LicenseValidation({ onValidate }: LicenseValidationProps) {
  const [licenseKey, setLicenseKey] = useState("")
  const [error, setError] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  // Check if we're in preview mode (same logic as time tracking data)
  const isPreview =
    typeof window === "undefined" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsValidating(true)

    try {
      const isValid = await onValidate(licenseKey.trim())

      if (!isValid) {
        setError("Invalid license key. Please check your key and try again.")
      }
    } catch (err) {
      setError("Failed to validate license. Please check your connection and try again.")
    } finally {
      setIsValidating(false)
    }
  }

  const handleDemoKeyClick = (key: string) => {
    setLicenseKey(key)
    setError("")
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Custom Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-800 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <Shield className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Development Time Tracker</h1>
            <p className="text-gray-600">License validation required</p>
          </div>
        </div>

        {/* License Validation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Enter License Key
            </CardTitle>
            <CardDescription>
              Please enter your valid license key to access the time tracking dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">License Key</Label>
                <Input
                  id="license-key"
                  type="text"
                  placeholder="Enter your license key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  required
                  className="font-mono"
                  disabled={isValidating}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={isValidating || !licenseKey.trim()}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Validating with API...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Validate License
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* API Info */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              License Validation
            </CardTitle>
            <CardDescription className="text-xs">
              {isPreview
                ? "Running in preview mode - demo keys available below"
                : "Licenses are validated through addons.francislabonte.com API"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Demo Keys Section - Only show in preview mode */}
        {isPreview && (
          <Card className="border-teal-200">
            <CardHeader>
              <CardTitle className="text-sm text-teal-800">Demo License Keys</CardTitle>
              <CardDescription className="text-xs">
                For testing purposes, you can use any of these demo keys:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_LICENSE_KEYS.map((key, index) => (
                <div key={key} className="flex items-center justify-between p-2 bg-teal-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {key.includes("DEV") ? "DEV" : key.includes("PRO") ? "PRO" : "ENT"}
                    </Badge>
                    <code className="text-xs font-mono text-teal-700">{key}</code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key)}
                      className="h-6 w-6 p-0 hover:bg-teal-100"
                      title="Copy to clipboard"
                      disabled={isValidating}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDemoKeyClick(key)}
                      className="h-6 px-2 text-xs hover:bg-teal-100"
                      disabled={isValidating}
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {isPreview
              ? "Preview mode: Demo keys work offline for testing."
              : "License validation requires an internet connection."}
          </p>
        </div>
      </div>
    </div>
  )
}
