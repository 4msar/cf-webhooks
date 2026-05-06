const STORAGE_KEY = 'webhook_recent_apps';
const MAX_RECENT = 8;

export interface RecentApp {
  slug: string;
  name: string;
  visitedAt: number;
}

export function getRecentApps(): RecentApp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentApp[];
  } catch {
    return [];
  }
}

export function addRecentApp(slug: string, name: string): void {
  try {
    const apps = getRecentApps().filter((a) => a.slug !== slug);
    apps.unshift({ slug, name, visitedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps.slice(0, MAX_RECENT)));
  } catch {
    // ignore write errors
  }
}

export function removeRecentApp(slug: string): void {
  try {
    const apps = getRecentApps().filter((a) => a.slug !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // ignore
  }
}
