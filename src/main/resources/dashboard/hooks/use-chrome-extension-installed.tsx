"use client"

import { useState, useEffect } from "react"

/**
 * Detects if the CodePulse Chrome extension is installed by checking for
 * the floating toolbar element injected by the extension.
 *
 * Returns undefined initially, then true if detected or false if not found
 * after a timeout.
 *
 * @param timeout Delay in milliseconds before performing the check.
 */
export function useChromeExtensionInstalled(timeout = 1000) {
  const [installed, setInstalled] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => {
      const toolbar = document.getElementById("mxo-toolbar")
      setInstalled(!!toolbar)
    }, timeout)

    return () => clearTimeout(timer)
  }, [timeout])

  return installed
}