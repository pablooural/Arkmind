/**
 * arkmind-mistral-proxy
 *
 * Endpoint: POST /v1/chat/completions
 *
 * Body esperado (compatible con la API de chat de Mistral/OpenAI):
 *   {
 *     "messages": [{ "role": "user", "content": "..." }, ...],
 *     "model"?: "mistral-small-latest" | "mistral-large-latest" | ...
 *     "temperature"?: number,
 *     "max_tokens"?: number,
 *   }
 *
 * Respuesta: JSON estándar de Mistral `chat.completion`.
 *
 * Configuración:
 *   - MISTRAL_API_KEY: secret en Cloudflare (wrangler secret put MISTRAL_API_KEY)
 *   - MISTRAL_MODEL: var plana (default: "mistral-small-latest")
 *   - ALLOWED_ORIGIN: var plana (default: "*")
 *
 * @see https://docs.mistral.ai/api/#tag/chat
 */

import { Hono } from "hono";

interface MistralChatRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface Env {
  MISTRAL_API_KEY: string;
  MISTRAL_MODEL?: string;
  ALLOWED_ORIGIN?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS preflight
app.options("*", (c) => {
  return c.body(null, 204, corsHeaders(c.env));
});

// Healthcheck
app.get("/", (c) => {
  return c.json({
    ok: true,
    worker: "arkmind-mistral-proxy",
    model: c.env.MISTRAL_MODEL ?? "mistral-small-latest",
    timestamp: new Date().toISOString(),
  });
});

// Diagnóstico liviano (no llama a Mistral, solo confirma config)
app.get("/healthz", (c) => {
  const hasKey = Boolean(c.env.MISTRAL_API_KEY);
  return c.json({
    ok: hasKey,
    hasMistralKey: hasKey,
    model: c.env.MISTRAL_MODEL ?? "mistral-small-latest",
  });
});

// Proxy principal
app.post("/v1/chat/completions", async (c) => {
  if (!c.env.MISTRAL_API_KEY) {
    return c.json(
      { error: "MISTRAL_API_KEY not configured. Run: wrangler secret put MISTRAL_API_KEY" },
      500,
      corsHeaders(c.env)
    );
  }

  let body: MistralChatRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400, corsHeaders(c.env));
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json(
      { error: "body.messages must be a non-empty array" },
      400,
      corsHeaders(c.env)
    );
  }

  const upstreamPayload = {
    model: body.model ?? c.env.MISTRAL_MODEL ?? "mistral-small-latest",
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 1024,
  };

  const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${c.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamPayload),
  });

  const text = await upstream.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { error: "non-JSON response from Mistral", raw: text };
  }

  return new Response(JSON.stringify(parsed), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(c.env),
    },
  });
});

// Fallback 404
app.notFound((c) => c.json({ error: "not found", path: c.req.path }, 404));

function corsHeaders(env: Env): Record<string, string> {
  const origin = env.ALLOWED_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default app;
