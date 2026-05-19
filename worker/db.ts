// D1 database operations

export interface WebhookApp {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface WebhookEvent {
  id: number;
  app_id: number;
  event_type: string | null;
  payload: string;
  headers: string;
  created_at: string;
}

// ─── Apps ────────────────────────────────────────────────────────────────────

export async function getAppBySlug(
  db: D1Database,
  slug: string,
): Promise<WebhookApp | null> {
  return db
    .prepare("SELECT * FROM webhook_apps WHERE slug = ?")
    .bind(slug)
    .first<WebhookApp>();
}

export async function createApp(
  db: D1Database,
  name: string,
  slug: string,
): Promise<WebhookApp> {
  await db
    .prepare("INSERT INTO webhook_apps (name, slug) VALUES (?, ?)")
    .bind(name, slug)
    .run();
  const app = await getAppBySlug(db, slug);
  if (!app) throw new Error("Failed to create app after insert");
  return app;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function insertEvent(
  db: D1Database,
  appId: number,
  eventType: string | null,
  payload: string,
  headers: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO webhook_events (app_id, event_type, payload, headers) VALUES (?, ?, ?, ?)",
    )
    .bind(appId, eventType, payload, headers)
    .run();

  // Keep only 100 most recent events per app (prune oldest)
  await db
    .prepare(
      `DELETE FROM webhook_events
       WHERE app_id = ? AND id NOT IN (
         SELECT id FROM webhook_events
         WHERE app_id = ?
         ORDER BY created_at DESC
         LIMIT 100
       )`,
    )
    .bind(appId, appId)
    .run();
}

export async function getEventsByAppId(
  db: D1Database,
  appId: number,
): Promise<WebhookEvent[]> {
  const result = await db
    .prepare(
      "SELECT * FROM webhook_events WHERE app_id = ? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(appId)
    .all<WebhookEvent>();
  return result.results;
}

export async function deleteEventsByAppId(
  db: D1Database,
  appId: number,
): Promise<void> {
  await db
    .prepare("DELETE FROM webhook_events WHERE app_id = ?")
    .bind(appId)
    .run();
}

export async function deleteOldEvents(
  db: D1Database,
  days: number = 30,
): Promise<void> {
  await db
    .prepare(
      'DELETE FROM webhook_events WHERE created_at < datetime("now", "-' +
        days +
        ' days")',
    )
    .run();
}

export async function deleteApp(db: D1Database, appId: number): Promise<void> {
  await db
    .prepare("DELETE FROM webhook_events WHERE app_id = ?")
    .bind(appId)
    .run();
  await db.prepare("DELETE FROM webhook_apps WHERE id = ?").bind(appId).run();
}
