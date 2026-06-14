import { Router } from "express";

const router = Router();

// Límite de caracteres del contenido del archivo que se manda a Mistral.
// Evita explotar el contexto con archivos enormes.
const MAX_FILE_CONTENT_CHARS = 12000;

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

      // Inyectar el contenido real del archivo si está disponible
      if (
        resourceContext.fileContent &&
        typeof resourceContext.fileContent === "string" &&
        resourceContext.fileContent.trim().length > 0
      ) {
        const content = resourceContext.fileContent.length > MAX_FILE_CONTENT_CHARS
          ? resourceContext.fileContent.slice(0, MAX_FILE_CONTENT_CHARS) +
            `\n\n[... contenido truncado — el archivo tiene ${resourceContext.fileContent.length} caracteres en total]`
          : resourceContext.fileContent;

        systemMessages.push({
          role: "system",
          content: `Contenido actual del archivo "${resourceContext.name}":\n\`\`\`\n${content}\n\`\`\`\nUsá este contenido como referencia directa cuando el usuario haga preguntas o pida cambios sobre él.`,
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
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => "(unreadable body)");
      }
      req.log.error({ error: errorBody, status: response.status }, "Mistral API error");
      res.status(response.status).json({ error: "Error en Mistral API" });
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (content === undefined || content === null) {
      req.log.warn({ data }, "Mistral returned empty content");
      res.status(502).json({ error: "La IA no generó una respuesta" });
      return;
    }

    res.json({ content });
  } catch (error) {
    req.log.error({ error }, "Error en /api/ai/message");
    res.status(500).json({ error: "Error procesando mensaje" });
  }
});

export default router;
