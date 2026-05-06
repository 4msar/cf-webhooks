import { getAppBySlug, insertEvent } from '../db';

const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

/** POST /api/:slug/webhook — receive and store a webhook event */
export async function handleWebhook(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  // Enforce size limit via Content-Length header (fast path)
  const contentLength = parseInt(
    request.headers.get('content-length') ?? '0',
    10,
  );
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return Response.json({ error: 'Payload too large (max 1 MB)' }, { status: 413 });
  }

  const app = await getAppBySlug(env.DB, slug);
  if (!app) {
    return Response.json({ error: 'App not found' }, { status: 404 });
  }

  // Read body with enforced size limit
  let rawBody: string;
  try {
    rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'Payload too large (max 1 MB)' }, { status: 413 });
    }
  } catch {
    return Response.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // Parse JSON body
  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  // Collect sanitised headers (skip potentially sensitive ones)
  const SKIP_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);
  const headersObj: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
      headersObj[key] = value;
    }
  }

  // Resolve event type: x-event-type header → body.event_type → body.type → null
  const eventType =
    request.headers.get('x-event-type') ??
    (isObject(payload) && typeof payload.event_type === 'string'
      ? payload.event_type
      : null) ??
    (isObject(payload) && typeof payload.type === 'string'
      ? payload.type
      : null);

  await insertEvent(
    env.DB,
    app.id,
    eventType,
    JSON.stringify(payload),
    JSON.stringify(headersObj),
  );

  return Response.json({ success: true, message: 'Webhook received' });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
