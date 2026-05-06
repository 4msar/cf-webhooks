import { getAppBySlug, getEventsByAppId } from '../db';

/** GET /api/:slug/events — return latest 100 events for an app */
export async function handleGetEvents(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const app = await getAppBySlug(env.DB, slug);
  if (!app) {
    return Response.json({ error: 'App not found' }, { status: 404 });
  }

  const events = await getEventsByAppId(env.DB, app.id);
  return Response.json(events);
}
