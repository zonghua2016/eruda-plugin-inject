export function generateRecordId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function generatePageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  // return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

export function getElapsedTime(startTime: number): string {
  return formatTime(Date.now() - startTime);
}