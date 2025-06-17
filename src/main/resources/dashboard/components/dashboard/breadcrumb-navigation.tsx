"use client"

import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbNavigation({ items }: BreadcrumbNavigationProps) {
  const router = useRouter()

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleNavigate("/dashboard")}
        className="h-6 px-2 hover:bg-gray-100"
      >
        <Home className="w-3 h-3 mr-1" />
        Dashboard
      </Button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-3 h-3 mx-1 text-gray-400" />
          {item.href && !item.current ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate(item.href!)}
              className="h-6 px-2 hover:bg-gray-100"
            >
              {item.label}
            </Button>
          ) : (
            <span className={`px-2 ${item.current ? "font-medium text-gray-900" : "text-gray-600"}`}>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
