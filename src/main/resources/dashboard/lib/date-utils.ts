export const EST_TIMEZONE = "America/New_York"

/**
 * Creates a Date object from a date string, ensuring it's interpreted as EST
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in EST
 */
export const createESTDate = (dateString: string): Date => {
  // Force the date to be interpreted as local EST time instead of UTC
  return new Date(dateString + "T00:00:00")
}

/**
 * Formats a date string to display in EST timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in EST
 */
export const formatDateInEST = (
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  },
): string => {
  const date = createESTDate(dateString)
  return date.toLocaleDateString("en-US", {
    timeZone: EST_TIMEZONE,
    ...options,
  })
}

/**
 * Formats a date string to short format (e.g., "Jan 15")
 */
export const formatDateShort = (dateString: string): string => {
  return formatDateInEST(dateString, {
    month: "short",
    day: "numeric",
  })
}

/**
 * Formats a date string to long format (e.g., "January 15, 2025")
 */
export const formatDateLong = (dateString: string): string => {
  return formatDateInEST(dateString, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Gets the day name for a date string (e.g., "Mon", "Tue")
 */
export const getDayName = (dateString: string): string => {
  return formatDateInEST(dateString, {
    weekday: "short",
  })
}

/**
 * Gets the full day name for a date string (e.g., "Monday", "Tuesday")
 */
export const getFullDayName = (dateString: string): string => {
  return formatDateInEST(dateString, {
    weekday: "long",
  })
}

/**
 * Converts a Date object to YYYY-MM-DD string in EST
 */
export const dateToESTString = (date: Date): string => {
  return date.toLocaleDateString("en-CA", {
    timeZone: EST_TIMEZONE,
  }) // en-CA gives YYYY-MM-DD format
}

/**
 * Gets the current date in EST as YYYY-MM-DD string
 */
export const getCurrentESTDateString = (): string => {
  return dateToESTString(new Date())
}

/**
 * Checks if a date string represents today in EST
 */
export const isToday = (dateString: string): boolean => {
  return dateString === getCurrentESTDateString()
}

/**
 * Checks if a date string represents yesterday in EST
 */
export const isYesterday = (dateString: string): boolean => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return dateString === dateToESTString(yesterday)
}

/**
 * Gets a relative date string (e.g., "Today", "Yesterday", or formatted date)
 */
export const getRelativeDateString = (dateString: string): string => {
  if (isToday(dateString)) return "Today"
  if (isYesterday(dateString)) return "Yesterday"
  return formatDateShort(dateString)
}
