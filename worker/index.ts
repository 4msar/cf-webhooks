import { handleGetApp, handleCreateApp } from "./handlers/apps";
import {
  handleGetEvents,
  handleTruncateEvents,
  handleCleanupOldEvents,
} from "./handlers/events";
import { handleWebhook } from "./handlers/webhook";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Event-Type",
} as const;

export default {
   
  async fetch(
    request: Request,
    env: Env,
    // _ctx: ExecutionContext,
  ): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // POST /api/apps — create new app
      if (path === "/api/apps" && request.method === "POST") {
        return addCors(await handleCreateApp(request, env));
      }

      // GET /api/apps/:slug — check if app exists
      const appMatch = path.match(/^\/api\/apps\/([^/]+)$/);
      if (appMatch && request.method === "GET") {
        return addCors(await handleGetApp(request, env, appMatch[1]));
      }

      // POST /api/:slug/webhook — receive webhook payload
      const webhookMatch = path.match(/^\/api\/([^/]+)\/webhook$/);
      if (webhookMatch && request.method === "POST") {
        return addCors(await handleWebhook(request, env, webhookMatch[1]));
      }

      // GET /api/:slug/events — list events
      // DELETE /api/:slug/events — truncate all events
      const eventsMatch = path.match(/^\/api\/([^/]+)\/events$/);
      if (eventsMatch && request.method === "GET") {
        return addCors(await handleGetEvents(request, env, eventsMatch[1]));
      }
      if (eventsMatch && request.method === "DELETE") {
        return addCors(
          await handleTruncateEvents(request, env, eventsMatch[1]),
        );
      }

      // DELETE /api/events/cleanup — clean up old events from all apps
      if (path === "/api/events/cleanup" && request.method === "DELETE") {
        return addCors(await handleCleanupOldEvents(request, env));
      }

      // All other routes → React SPA (served via ASSETS binding)
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error("Unhandled worker error:", err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500, headers: CORS_HEADERS },
      );
    }
  },
} satisfies ExportedHandler<Env>;

function addCors(response: Response): Response {
  const next = new Response(response.body, response);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => next.headers.set(k, v));
  return next;
}
