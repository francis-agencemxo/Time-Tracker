"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, Key, CheckCircle, AlertCircle, Copy, Loader2, Globe, Clock, Lock, HardDrive, Info } from "lucide-react"
import { useLicenseValidation } from "@/hooks/use-license-validation"

interface LicenseValidationProps {
  onValidate: (licenseKey: string) => Promise<boolean>
}

// Fake license keys for testing
const DEMO_LICENSE_KEYS = ["MXO-DEV-2025"]

export function LicenseValidation({ onValidate }: LicenseValidationProps) {
  const { checkBackendAvailability } = useLicenseValidation()
  const [licenseKey, setLicenseKey] = useState("")
  const [error, setError] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false)
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)

  // Determine database path based on OS
  const getDatabasePath = () => {
    if (typeof window === "undefined") return ""

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isWindows = userAgent.includes("win")
    const isMac = userAgent.includes("mac")

    if (isWindows) {
      return "%USERPROFILE%\\.cache\\phpstorm-time-tracker\\data.db"
    } else if (isMac) {
      return "~/.cache/phpstorm-time-tracker/data.db"
    } else {
      // Linux and others
      return "~/.cache/phpstorm-time-tracker/data.db"
    }
  }

  // Check if privacy has been acknowledged
  useEffect(() => {
    if (typeof window !== "undefined") {
      const acknowledged = localStorage.getItem("privacy-acknowledged")
      setPrivacyAcknowledged(acknowledged === "true")
      if (acknowledged !== "true") {
        setShowPrivacyDialog(true)
      }
    }
  }, [])

  // Handle URL parameters for license key return
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const licenseFromUrl = urlParams.get("license") || urlParams.get("licensekey")

      if (licenseFromUrl) {
        setLicenseKey(licenseFromUrl)
        setError("")

        // Clean up URL parameters
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)

        // Auto-validate the license key
        handleAutoValidate(licenseFromUrl)
      }
    }
  }, [])

  // Auto-validation function for URL-provided license keys
  const handleAutoValidate = async (key: string) => {
    setIsValidating(true)
    try {
      const isValid = await onValidate(key.trim())
      if (!isValid) {
        // Check if backend is available
        const backendAvailable = await checkBackendAvailability()
        if (!backendAvailable) {
          setError("Please open a PhpStorm project with the Time Tracker plugin to access the dashboard.")
        } else {
          setError("The license key from login portal is invalid. Please try again.")
        }
      }
    } catch (err) {
      setError("Failed to validate license from login portal. Please check your connection.")
    } finally {
      setIsValidating(false)
    }
  }

  // Check if we're in preview mode (same logic as time tracking data)
  const isPreview =
    typeof window === "undefined" ||
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net") ||
    process.env.NODE_ENV === "development"

  console.log(window.location)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsValidating(true)

    try {
      const isValid = await onValidate(licenseKey.trim())

      if (!isValid) {
        // Check if backend is available
        const backendAvailable = await checkBackendAvailability()
        if (!backendAvailable) {
          setError("Please open a PhpStorm project with the Time Tracker plugin to access the dashboard.")
        } else {
          setError("Invalid license key. Please check your key and try again.")
        }
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

  const handlePrivacyAcknowledge = () => {
    localStorage.setItem("privacy-acknowledged", "true")
    setPrivacyAcknowledged(true)
    setShowPrivacyDialog(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      {/* Privacy Acknowledgement Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-6 w-6 text-teal-600" />
              Privacy & Data Storage
            </DialogTitle>
            <DialogDescription>
              Understanding how your data is stored and protected
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-teal-200 bg-teal-50">
              <HardDrive className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                <strong>All data stays on your computer.</strong> Your time tracking data is stored locally and never uploaded to any server.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Local Storage Only</p>
                  <p className="text-gray-600">All time tracking data is stored in your browser's local storage on your computer. No data is sent to external servers.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No Cloud Synchronization</p>
                  <p className="text-gray-600">Your data remains private and is not synchronized or backed up to any cloud service.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">License Validation Only</p>
                  <p className="text-gray-600">The only external connection is for license validation. Your usage data and project information are never shared.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Your Responsibility</p>
                  <p className="text-gray-600 mb-2">Since data is stored locally, you are responsible for backing up your data if needed.</p>
                  <p className="text-gray-600 text-xs font-mono bg-gray-100 p-2 rounded border break-all">
                    Database location: {getDatabasePath()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handlePrivacyAcknowledge}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I Understand - Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

              {licenseKey && !error && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    License key loaded successfully. Click "Validate License" to continue.
                  </AlertDescription>
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

              {/* Add divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Add login button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const currentUrl = window.location.origin + window.location.pathname
                  const loginUrl = `https://addons.francislabonte.com/licenses/getkey/codepulse?return=${encodeURIComponent(currentUrl)}`
                  window.location.href = loginUrl
                }}
                disabled={isValidating}
              >
                <Globe className="w-4 h-4 mr-2" />
                Validate by Login
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
              <CardTitle className="text-sm text-teal-800">Demo License Key</CardTitle>
              <CardDescription className="text-xs">
                For testing purposes, you can use this demo key:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_LICENSE_KEYS.map((key, index) => (
                <div key={key} className="flex items-center justify-between p-2 bg-teal-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {key.includes("DEV") ? "DEV" : key.includes("PRO") ? "PRO" : "DEMO"}
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
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500">
            {isPreview
              ? "Preview mode: Demo keys work offline for testing."
              : "License validation requires an internet connection."}
          </p>
          <button
            onClick={() => setShowPrivacyDialog(true)}
            className="text-xs text-teal-600 hover:text-teal-700 underline"
          >
            View Privacy & Data Storage Information
          </button>
        </div>
      </div>
    </div>
  )
}
