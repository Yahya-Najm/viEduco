export const DEFAULT_UPLOAD_LIMIT_SECONDS = 300

export function formatMinutes(seconds: number): string {
  const minutes = seconds / 60
  return minutes === Math.floor(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`
}
