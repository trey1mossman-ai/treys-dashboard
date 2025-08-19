export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid time'
  }
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function getProgressPercentage(
  now: Date,
  startHour: number = 6,
  endHour: number = 22
): number {
  const nowMinutes = getMinutesSinceMidnight(now)
  const startMinutes = startHour * 60
  const endMinutes = endHour * 60
  
  if (nowMinutes < startMinutes) return 0
  if (nowMinutes > endMinutes) return 100
  
  return ((nowMinutes - startMinutes) / (endMinutes - startMinutes)) * 100
}

export function isTimeInRange(time: Date, start: Date, end: Date): boolean {
  return time >= start && time <= end
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function getTodayDateString(): string {
  return getDateString(new Date())
}

export function parseTimeString(timeStr: string, baseDate: Date = new Date()): Date {
  const [time, period] = timeStr.split(' ')
  const [hours, minutes] = time.split(':').map(Number)
  
  const date = new Date(baseDate)
  let adjustedHours = hours
  
  if (period === 'PM' && hours !== 12) {
    adjustedHours += 12
  } else if (period === 'AM' && hours === 12) {
    adjustedHours = 0
  }
  
  date.setHours(adjustedHours, minutes, 0, 0)
  return date
}

export function addMinutes(date: Date, minutes: number): Date {
  const newDate = new Date(date)
  newDate.setMinutes(newDate.getMinutes() + minutes)
  return newDate
}