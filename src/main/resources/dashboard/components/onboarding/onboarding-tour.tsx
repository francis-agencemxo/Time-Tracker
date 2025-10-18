"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep, type Driver } from "driver.js"
import "driver.js/dist/driver.css"

interface OnboardingTourProps {
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null)

  useEffect(() => {
    // Define tour steps
    const steps: DriveStep[] = [
      {
        element: "body",
        popover: {
          title: "Welcome to PhpStorm Time Tracker",
          description:
            "Let's take a quick tour to help you get started. This will only take a minute to show you the main features and views of the application.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "[data-tour='header']",
        popover: {
          title: "Header Controls",
          description:
            "Access your settings, refresh data, view license information, and logout from here. You can also adjust idle timeout and storage preferences.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='week-navigation']",
        popover: {
          title: "Week Navigation",
          description:
            "Navigate between different weeks to view your time tracking data. Click the arrows to move forward or backward in time.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='quick-stats']",
        popover: {
          title: "Quick Stats Overview",
          description:
            "Get a quick overview of your key metrics for the selected week, including total hours, active projects, and productivity insights.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='timesheet-tab']",
        popover: {
          title: "Weekly Timesheet View",
          description:
            "This is your main timesheet view showing all projects and hours for the week. Use this to track time across different projects and days.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "[data-tour='daily-details-tab']",
        popover: {
          title: "Daily Details View",
          description:
            "Switch to this tab to see a detailed breakdown of your activities by day, including individual sessions, files worked on, and websites visited.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "[data-tour='settings-tab']",
        popover: {
          title: "Settings & Configuration",
          description:
            "Manage your projects here: hide/show projects, set custom names, assign clients, and configure project URLs. This is where you customize your tracking experience.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "body",
        popover: {
          title: "You're All Set!",
          description:
            "That's it! You now know the main features of the Time Tracker. Start tracking your time and manage your projects efficiently. You can restart this tour anytime from the help button in the header.",
          side: "top",
          align: "center",
        },
      },
    ]

    // Initialize driver
    const driverObj = driver({
      showProgress: true,
      steps: steps,
      onDestroyStarted: () => {
        // Check if tour was completed (last step) or skipped
        const currentStep = driverObj.getActiveIndex()
        const totalSteps = steps.length

        if (currentStep === totalSteps - 1 || !driverObj.hasNextStep()) {
          onComplete()
        } else {
          onSkip()
        }

        driverObj.destroy()
      },
      popoverClass: "driverjs-theme",
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Finish",
    })

    driverRef.current = driverObj

    // Start the tour
    driverObj.drive()

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [onComplete, onSkip])

  return null // This component doesn't render anything itself
}
