export interface WrikeProject {
  id: string
  title: string
  permalink: string
  customStatusId?: string
  description?: string
}

export interface WrikeFolder {
  id: string
  title: string
  permalink: string
  scope: string
  project?: {
    authorId: string
    ownerIds: string[]
    status: string
    customStatusId?: string
  }
}

export interface WrikeApiResponse<T> {
  kind: string
  data: T[]
}

export class WrikeApiClient {
  private baseUrl: string
  private bearerToken: string | null = null
  private useProxy: boolean

  constructor(bearerToken?: string, useProxy: boolean = true) {
    // In production (bundled in Java plugin), use the backend proxy
    // In development or when useProxy is true, route through our backend
    this.useProxy = useProxy

    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      // Production: use the Java backend proxy
      this.baseUrl = "/api/wrike"
    } else if (useProxy) {
      // Development: use the local backend proxy
      const port = process.env.NEXT_PUBLIC_TRACKER_SERVER_PORT || "56000"
      this.baseUrl = `http://localhost:${port}/api/wrike`
    } else {
      // Direct access (will fail due to CORS)
      this.baseUrl = "https://www.wrike.com/api/v4"
    }

    if (bearerToken) {
      this.bearerToken = bearerToken
    }
  }

  setBearerToken(token: string) {
    this.bearerToken = token
  }

  private async request<T>(endpoint: string): Promise<WrikeApiResponse<T>> {
    if (!this.bearerToken) {
      throw new Error("Wrike bearer token not configured")
    }

    const url = this.useProxy
      ? `${this.baseUrl}${endpoint}`
      : `https://www.wrike.com/api/v4${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // When using proxy, send token as a custom header that the backend will use
    if (this.useProxy) {
      headers["X-Wrike-Token"] = this.bearerToken
    } else {
      // Direct access (will fail due to CORS, but keeping for reference)
      headers["Authorization"] = `Bearer ${this.bearerToken}`
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      let errorMessage = `Wrike API error: ${response.status} ${response.statusText}`

      // Try to get more detailed error information from response body
      try {
        const errorBody = await response.text()
        if (errorBody) {
          const parsed = JSON.parse(errorBody)
          if (parsed.errorDescription) {
            errorMessage = parsed.errorDescription
          } else if (parsed.error) {
            errorMessage = parsed.error
          }
        }
      } catch (e) {
        // Ignore if we can't parse the error body
      }

      // Provide helpful hints for common errors
      if (response.status === 401) {
        errorMessage = "Invalid Wrike bearer token. Please check that your token is correct and hasn't expired."
      } else if (response.status === 404) {
        errorMessage = "Wrike API endpoint not found. The backend proxy may not be running."
      }

      throw new Error(errorMessage)
    }

    return response.json()
  }

  async getProjects(): Promise<WrikeProject[]> {
    try {
      // Fetch all folders that are projects
      const response = await this.request<WrikeFolder>("/folders?project=true")

      return response.data
        .filter((folder) => folder.project)
        .map((folder) => ({
          id: folder.id,
          title: folder.title,
          permalink: folder.permalink,
          customStatusId: folder.project?.customStatusId,
        }))
    } catch (error) {
      console.error("Failed to fetch Wrike projects:", error)
      throw error
    }
  }

  async getProjectById(projectId: string): Promise<WrikeProject | null> {
    try {
      const response = await this.request<WrikeFolder>(`/folders/${projectId}`)
      const folder = response.data[0]

      if (!folder || !folder.project) {
        return null
      }

      return {
        id: folder.id,
        title: folder.title,
        permalink: folder.permalink,
        customStatusId: folder.project.customStatusId,
      }
    } catch (error) {
      console.error(`Failed to fetch Wrike project ${projectId}:`, error)
      return null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test the connection by fetching user info
      await this.request("/contacts?me=true")
      return true
    } catch (error) {
      console.error("Wrike connection test failed:", error)
      return false
    }
  }
}

// Singleton instance
let wrikeClient: WrikeApiClient | null = null

export function getWrikeClient(bearerToken?: string): WrikeApiClient {
  if (!wrikeClient) {
    wrikeClient = new WrikeApiClient(bearerToken)
  } else if (bearerToken) {
    wrikeClient.setBearerToken(bearerToken)
  }
  return wrikeClient
}
