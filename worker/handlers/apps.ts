import { createApp, getAppBySlug, deleteApp } from "../db";

// Converts any string into a URL-safe slug
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** GET /api/apps/:slug — returns app info or 404 */
export async function handleGetApp(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const app = await getAppBySlug(env.DB, slug);
  if (!app) {
    return Response.json({ error: "App not found" }, { status: 404 });
  }
  return Response.json(app);
}

/** POST /api/apps — create a new app; body: { name: string } */
export async function handleCreateApp(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { name?: unknown };
  try {
    body = (await request.json()) as { name?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const slug = toSlug(name);
  if (!slug) {
    return Response.json(
      { error: "name must contain at least one alphanumeric character" },
      { status: 400 },
    );
  }

  // Return existing app if slug already taken
  const existing = await getAppBySlug(env.DB, slug);
  if (existing) {
    return Response.json(existing, { status: 200 });
  }

  const app = await createApp(env.DB, name, slug);
  return Response.json(app, { status: 201 });
}

/** DELETE /api/apps/:slug — delete app and its events */
export async function handleDeleteApp(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const app = await getAppBySlug(env.DB, slug);
  if (!app) {
    return Response.json({ error: "App not found" }, { status: 404 });
  }
  await deleteApp(env.DB, app.id);
  return Response.json({ ok: true });
}
