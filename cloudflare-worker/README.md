# arkmind-mistral-proxy

Cloudflare Worker que recibe requests del frontend Arkmind (deploy estático) y los
reenvía a Mistral AI. Mantiene la API key en Cloudflare Secrets — **nunca se commitea**.

## Endpoints

| Método | Path | Descripción |
|---|---|---|
| GET | `/` | Healthcheck (no llama a Mistral) |
| GET | `/healthz` | Diagnóstico liviano: confirma que el secret está configurado |
| POST | `/v1/chat/completions` | Proxy a Mistral chat completions |
| OPTIONS | `*` | CORS preflight |

## Deploy en 4 pasos

### 1. Instalar wrangler (si no lo tenés)

```bash
npm install -g wrangler
```

### 2. Login en Cloudflare

```bash
wrangler login
```

Esto abre el browser para que autorices a wrangler contra tu cuenta de Cloudflare.
Si Arkmind ya está en Cloudflare (Workers & Pages), usás esa misma cuenta.

### 3. Configurar el secret MISTRAL_API_KEY

```bash
cd cloudflare-worker
wrangler secret put MISTRAL_API_KEY
```

Te pide el valor interactivamente. Pegá la key (32 caracteres alfanuméricos) y apretá Enter. **No se loggea, queda encriptada en Cloudflare.**

Para verificar que quedó:

```bash
wrangler secret list
# Muestra: ["MISTRAL_API_KEY"]
```

> **Tip de seguridad:** la key NO va en `wrangler.toml`, NO va en commits, NO va en PRs.
> Solo en `wrangler secret put`. Si alguna vez se filtró, rotala en
> https://console.mistral.ai/ y volvé a hacer `secret put`.

### 4. Deploy

```bash
wrangler deploy
```

Output esperado:

```
Published arkmind-mistral-proxy (X.XX sec)
  https://arkmind-mistral-proxy.<tu-subdomain>.workers.dev
```

Anotá esa URL — la usa el frontend.

### Verificar que funciona

```bash
# Healthcheck (no necesita key, confirma que el Worker responde)
curl https://arkmind-mistral-proxy.<sub>.workers.dev/healthz
# → {"ok":true,"hasMistralKey":true,"model":"mistral-small-latest"}

# Chat completion (sí usa la key)
curl -X POST https://arkmind-mistral-proxy.<sub>.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hola"}]}'
```

## Variables de configuración

| Var | Tipo | Default | Descripción |
|---|---|---|---|
| `MISTRAL_API_KEY` | secret | — | **obligatoria.** Obtener en https://console.mistral.ai/ |
| `MISTRAL_MODEL` | var plana | `mistral-small-latest` | Modelo a usar. Otros: `mistral-large-latest`, `mistral-medium-latest`, etc. |
| `ALLOWED_ORIGIN` | var plana | `*` | CORS allow-origin. Para producción, cambiar al dominio real del deploy. |

## Estructura

```
cloudflare-worker/
├── package.json      # wrangler + hono + types
├── wrangler.toml     # config del Worker
├── tsconfig.json     # TypeScript config
├── README.md         # este archivo
└── src/
    └── index.ts      # proxy con Hono
```

## Por qué este diseño

**Por qué un Worker separado (no llamar a Mistral directo desde el browser):**
1. La API key NO puede vivir en el bundle del frontend (cualquiera la ve)
2. Mistral NO permite CORS para llamadas directas desde browser
3. Un Worker gratis (100k req/día) cubre uso de prototipo sin pagar

**Por qué Hono (no fetch nativo):**
- Routing limpio (`app.post("/v1/...")`)
- Validación y middlewares si los necesitamos después
- ~12 KB bundle minificado — no infla el deploy

**Por qué NO streaming (todavía):**
- Más simple para v1 (devolver JSON completo)
- El frontend puede mostrar el resultado cuando llegue
- Cuando Pablo quiera streaming token-por-token, se agrega SSE en una versión 2 (issue aparte, NO en este PR)

## Conectar al frontend Arkmind

Una vez deployado, en `artifacts/ux-arquitecto/src/hooks/useAI.ts` (o similar),
reemplazar la URL hardcodeada de Mistral por la URL del Worker:

```ts
// Antes (llamada directa, no funciona en deploy estático por CORS):
// const res = await fetch("https://api.mistral.ai/v1/chat/completions", ...);

// Después (vía Worker):
const res = await fetch("https://arkmind-mistral-proxy.<sub>.workers.dev/v1/chat/completions", ...);
```

**Esto se hace en un PR aparte** una vez que el Worker esté deployado y Pablo tenga la URL.
