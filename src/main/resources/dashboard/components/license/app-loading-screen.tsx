"use client"

import { Shield, Loader2, Clock } from "lucide-react"

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        {/* Custom Logo Design */}
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
          <p className="text-gray-600 mt-2">Initializing application...</p>
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="text-sm text-gray-600">Validating license...</span>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  )
}
