import { Router } from "express";

const router = Router();

router.get("/config", (_req, res) => {
  res.json({
    mistral: {
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || "0.7"),
      maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS || "2048"),
    },
    supabase: {
      url: process.env.SUPABASE_URL,
    },
    configured: !!process.env.MISTRAL_API_KEY,
  });
});

router.post("/message", async (req, res) => {
  try {
    const { message, model, history, resourceContext, memoryBlock } = req.body;

    if (!message) {
      res.status(400).json({ error: "Mensaje requerido" });
      return;
    }

    if (!process.env.MISTRAL_API_KEY) {
      res.status(500).json({ error: "Mistral API key no configurada" });
      return;
    }

    const mistralModel = model || process.env.MISTRAL_MODEL || "mistral-small-latest";

    const systemMessages: { role: string; content: string }[] = [
      {
        role: "system",
        content:
          "Eres el núcleo conversacional de un Context Runtime universal. Tu rol no está limitado a programación ni arquitectura de software: podés trabajar sobre cualquier tipo de recurso — código, narrativa, investigación, diseño, documentación, ideas ramificadas, simulaciones, historias, capítulos, tareas, notas, o cualquier estructura que el usuario esté navegando. Adaptás tu modo de respuesta al contexto activo: si el usuario trabaja sobre un capítulo de una novela, respondés como colaborador narrativo; si trabaja sobre código, respondés como revisor técnico; si trabaja sobre una investigación, respondés como asistente de análisis. Nunca asumís que el contexto es necesariamente técnico. Tu objetivo es mantener coherencia contextual, ayudar a bifurcar ideas, hacer preguntas que abran caminos, y proponer snapshots cuando detectás que el usuario está por hacer algo importante o arriesgado. Respondé siempre en español, de forma concisa y directa.",
      },
    ];

    // Inyectar memoria del runtime si existe
    if (memoryBlock && typeof memoryBlock === "string" && memoryBlock.trim().length > 0) {
      systemMessages.push({
        role: "system",
        content: memoryBlock,
      });
    }

    // Inyectar contexto del recurso activo si existe
    if (resourceContext && resourceContext.name) {
      const typeLabels: Record<string, string> = {
        file: "archivo", folder: "carpeta", conversation: "conversación",
        story: "historia", chapter: "capítulo", snapshot: "snapshot",
        task: "tarea", note: "nota", "ai-node": "nodo IA",
        branch: "rama", document: "documento",
      };
      const label = typeLabels[resourceContext.type] || resourceContext.type;
      systemMessages.push({
        role: "system",
        content: `Recurso activo: "${resourceContext.name}" (${label}) en la ruta ${resourceContext.path}. Adaptá tu respuesta a este tipo de recurso específico.`,
      });

      // Inyectar contenido del archivo si está disponible (T-030)
      if (resourceContext.fileContent && typeof resourceContext.fileContent === "string" &&
          resourceContext.fileContent.trim().length > 0) {
        const MAX_FILE_CONTENT_CHARS = 12000;
        const fileContent = resourceContext.fileContent.length > MAX_FILE_CONTENT_CHARS
          ? resourceContext.fileContent.slice(0, MAX_FILE_CONTENT_CHARS) +
            `\n\n[... contenido truncado — el archivo tiene ${resourceContext.fileContent.length} caracteres en total]`
          : resourceContext.fileContent;
        systemMessages.push({
          role: "system",
          content: `Contenido actual del archivo "${resourceContext.name}":\n\`\`\`\n${fileContent}\n\`\`\`\nUsá este contenido como referencia directa cuando el usuario haga preguntas o pida cambios sobre él.`,
        });
      }
    }

    const messages = [
      ...systemMessages,
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: mistralModel,
        messages,
        temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || "0.7"),
        max_tokens: parseInt(process.env.MISTRAL_MAX_TOKENS || "2048"),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      req.log.error({ error }, "Mistral API error");
      res.status(response.status).json({ error: "Error en Mistral API" });
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    res.json({ content });
  } catch (error) {
    req.log.error({ error }, "Error en /api/ai/message");
    res.status(500).json({ error: "Error procesando mensaje" });
  }
});


router.post("/stream", async (req, res) => {
  try {
    const { message, model, history, resourceContext, memoryBlock } = req.body;

    if (!message) {
      res.status(400).json({ error: "Mensaje requerido" });
      return;
    }

    if (!process.env.MISTRAL_API_KEY) {
      res.status(500).json({ error: "Mistral API key no configurada" });
      return;
    }

    const mistralModel = model || process.env.MISTRAL_MODEL || "mistral-small-latest";

    const systemMessages: { role: string; content: string }[] = [
      {
        role: "system",
        content:
          "Eres el núcleo conversacional de un Context Runtime universal. Tu rol no está limitado a programación ni arquitectura de software: podés trabajar sobre cualquier tipo de recurso — código, narrativa, investigación, diseño, documentación, ideas ramificadas, simulaciones, historias, capítulos, tareas, notas, o cualquier estructura que el usuario esté navegando. Adaptás tu modo de respuesta al contexto activo: si el usuario trabaja sobre un capítulo de una novela, respondés como colaborador narrativo; si trabaja sobre código, respondés como revisor técnico; si trabaja sobre una investigación, respondés como asistente de análisis. Nunca asumís que el contexto es necesariamente técnico. Tu objetivo es mantener coherencia contextual, ayudar a bifurcar ideas, hacer preguntas que abran caminos, y proponer snapshots cuando detectás que el usuario está por hacer algo importante o arriesgado. Respondé siempre en español, de forma concisa y directa.",
      },
    ];

    if (memoryBlock && typeof memoryBlock === "string" && memoryBlock.trim().length > 0) {
      systemMessages.push({ role: "system", content: memoryBlock });
    }

    if (resourceContext && resourceContext.name) {
      const typeLabels: Record<string, string> = {
        file: "archivo", folder: "carpeta", conversation: "conversación",
        story: "historia", chapter: "capítulo", snapshot: "snapshot",
        task: "tarea", note: "nota", "ai-node": "nodo IA", branch: "rama", document: "documento",
      };
      const label = typeLabels[resourceContext.type] || resourceContext.type;
      systemMessages.push({
        role: "system",
        content: `Recurso activo: "${resourceContext.name}" (${label}) en la ruta ${resourceContext.path}. Adaptá tu respuesta a este tipo de recurso específico.`,
      });

      if (resourceContext.fileContent && typeof resourceContext.fileContent === "string" &&
          resourceContext.fileContent.trim().length > 0) {
        const MAX_FILE_CONTENT_CHARS = 12000;
        const fileContent = resourceContext.fileContent.length > MAX_FILE_CONTENT_CHARS
          ? resourceContext.fileContent.slice(0, MAX_FILE_CONTENT_CHARS) +
            `\n\n[... contenido truncado — el archivo tiene ${resourceContext.fileContent.length} caracteres en total]`
          : resourceContext.fileContent;
        systemMessages.push({
          role: "system",
          content: `Contenido actual del archivo "${resourceContext.name}":\n\`\`\`\n${fileContent}\n\`\`\`\nUsá este contenido como referencia directa cuando el usuario haga preguntas o pida cambios sobre él.`,
        });
      }
    }

    const messages = [
      ...systemMessages,
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: mistralModel,
        messages,
        temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || "0.7"),
        max_tokens: parseInt(process.env.MISTRAL_MAX_TOKENS || "2048"),
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      res.write(`data: ${JSON.stringify({ error: "Error en Mistral API" })}\n\n`);
      res.end();
      return;
    }

    const reader = (upstream.body as unknown as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buf = "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        try {
          const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
        } catch { /* skip malformed chunks */ }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    req.log.error({ error }, "Error en /api/ai/stream");
    if (!res.headersSent) {
      res.status(500).json({ error: "Error procesando stream" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream interrumpido" })}\n\n`);
      res.end();
    }
  }
});

export default router;
