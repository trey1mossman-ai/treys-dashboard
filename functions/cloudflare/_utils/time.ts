// Time utilities for RFC3339 formatting with timezone support
export function epochToRFC3339(epochSeconds: number, timezone: string = 'America/Chicago'): string {
  const date = new Date(epochSeconds * 1000);
  
  // Map common timezones to offsets (simplified)
  const tzOffsets: { [key: string]: string } = {
    'America/Chicago': '-06:00',
    'America/New_York': '-05:00',
    'America/Los_Angeles': '-08:00',
    'America/Denver': '-07:00',
    'UTC': 'Z',
    'Europe/London': '+00:00',
    'Europe/Paris': '+01:00',
    'Asia/Tokyo': '+09:00'
  };

  const offset = tzOffsets[timezone] || '-06:00';
  const isoString = date.toISOString().slice(0, -1); // Remove 'Z'
  
  return offset === 'Z' ? date.toISOString() : `${isoString}${offset}`;
}

export function rfc3339ToEpoch(rfc3339: string): number {
  return Math.floor(new Date(rfc3339).getTime() / 1000);
}

export function formatDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}