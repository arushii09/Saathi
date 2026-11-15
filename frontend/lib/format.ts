export function formatTime(isoString?: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSec = Math.round(seconds % 60);
  return `${mins}m ${remainingSec}s`;
}

export function formatConfidence(conf: number | null | undefined): { text: string; isLow: boolean; isUnknown: boolean } {
  if (conf === null || conf === undefined || isNaN(conf)) {
    return { text: 'Confidence unknown', isLow: false, isUnknown: true };
  }
  const pct = Math.round(conf <= 1 ? conf * 100 : conf);
  return {
    text: `${pct}%`,
    isLow: pct < 70,
    isUnknown: false,
  };
}

export function formatTimeOffset(startIso: string, currentIso: string): string {
  try {
    const start = new Date(startIso).getTime();
    const current = new Date(currentIso).getTime();
    const diffMs = Math.max(0, current - start);
    const diffSec = (diffMs / 1000).toFixed(1);
    return `+${diffSec}s`;
  } catch {
    return '+0.0s';
  }
}
