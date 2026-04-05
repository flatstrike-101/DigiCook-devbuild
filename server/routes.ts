import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DIGICOOK_SYSTEM_PROMPT = `
You are DigiCook Assistant.
Goal: generate practical, beginner-friendly, concise recipe help.

Intent handling:
- If user asks for multiple ideas (e.g. "a few recipes", "some options", "give me 5"), return ONLY a short numbered list of options.
- For list mode, each option must be:
  1) title (max 4 words),
  2) one short sentence on why it fits.
- In list mode, do NOT output full ingredients/steps yet.
- In list mode, add one short friendly lead-in sentence before the list, such as "Sure, here are some simple recipes you could make:"
- After the list, use this exact style of follow-up (or very close): "Would you like me to send the full recipe for one of the options above?"
- Only output a full structured recipe after user picks one option or explicitly asks for one full recipe.

When outputting a full recipe, use ONLY this structure:
Title: <max 4 words>
Description: <1 short sentence>
Ingredients:
- <amount> <unit> <ingredient name>
- <amount> <unit> <ingredient name>
Steps:
1. <short step>
2. <short step>

Rules for full recipe output:
- Keep it simple.
- 5 to 8 ingredients max.
- 4 to 7 steps max.
- Use short names and short steps.
- Include amount and unit for each ingredient whenever possible.
- Use common units only: cup, tbsp, tsp, oz, lb, g, kg, ml, l, pcs, clove, slice.
- Do NOT include extra sections (no substitutions, tips, notes, nutrition) unless user explicitly asks.
- Never claim to have cooked anything yourself.

If the user is not asking for a recipe, reply normally but concise.
`.trim();

const aiWindowMs = 60 * 60 * 1000;
const aiLimitPerWindow = 30;
const aiRequestBuckets = new Map<string, number[]>();
const ollamaDefaultBaseUrl = "http://127.0.0.1:11434";
const ollamaDefaultModel = "llama3.1:8b";

function isRateLimited(key: string) {
  // Disable local API rate-limiting in development to keep prototyping unblocked.
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  const now = Date.now();
  const bucket = aiRequestBuckets.get(key) ?? [];
  const recent = bucket.filter((ts) => now - ts < aiWindowMs);
  if (recent.length >= aiLimitPerWindow) {
    aiRequestBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  aiRequestBuckets.set(key, recent);
  return false;
}

function isQuotaLikeError(err: unknown) {
  const message = String((err as any)?.message ?? err ?? "").toLowerCase();
  return (
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("429")
  );
}

function shouldPreferOllama() {
  return (process.env.AI_PROVIDER ?? "").trim().toLowerCase() === "ollama";
}

async function callOllama(messages: ChatMessage[]) {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? ollamaDefaultBaseUrl).replace(/\/+$/, "");
  const model = (process.env.OLLAMA_MODEL ?? ollamaDefaultModel).trim();

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: {
        temperature: 0.4,
      },
      messages: [
        { role: "system", content: DIGICOOK_SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Ollama request failed (${response.status}) on ${model}: ${raw}`);
  }

  const data = (await response.json()) as any;
  const text = String(data?.message?.content ?? "").trim();
  if (!text) {
    throw new Error(`Ollama returned an empty response for model ${model}.`);
  }

  return { text, model: `ollama:${model}` };
}

async function callOllamaStream(messages: ChatMessage[], onChunk: (chunk: string) => void) {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? ollamaDefaultBaseUrl).replace(/\/+$/, "");
  const model = (process.env.OLLAMA_MODEL ?? ollamaDefaultModel).trim();

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      options: {
        temperature: 0.4,
      },
      messages: [
        { role: "system", content: DIGICOOK_SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Ollama stream failed (${response.status}) on ${model}: ${raw}`);
  }

  if (!response.body) {
    throw new Error(`Ollama stream returned no body for model ${model}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      try {
        const payload = JSON.parse(line) as any;
        const text = String(payload?.message?.content ?? "");
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // ignore malformed line chunks
      }
    }
  }

  if (buffer.trim()) {
    try {
      const payload = JSON.parse(buffer.trim()) as any;
      const text = String(payload?.message?.content ?? "");
      if (text) {
        fullText += text;
        onChunk(text);
      }
    } catch {
      // ignore trailing malformed chunk
    }
  }

  if (!fullText.trim()) {
    throw new Error(`Ollama stream returned an empty response for model ${model}.`);
  }

  return { text: fullText, model: `ollama:${model}` };
}

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set on the server.");
  }

  const requestedModel = process.env.GEMINI_MODEL?.trim();
  const candidateModels = requestedModel
    ? [requestedModel]
    : ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastError = "";
  for (const model of candidateModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [{ text: DIGICOOK_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    if (!response.ok) {
      const raw = await response.text();
      lastError = `Gemini request failed (${response.status}) on ${model}: ${raw}`;
      // If model is not found/supported, try the next candidate.
      if (response.status === 404) continue;
      throw new Error(lastError);
    }

    const data = (await response.json()) as any;
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();

    if (!text) {
      lastError = `Gemini returned an empty response for model ${model}.`;
      continue;
    }

    return { text, model };
  }

  throw new Error(lastError || "No compatible Gemini model was found for this API key/project.");
}

async function callGeminiStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set on the server.");
  }

  const requestedModel = process.env.GEMINI_MODEL?.trim();
  const candidateModels = requestedModel
    ? [requestedModel]
    : ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastError = "";

  for (const model of candidateModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [{ text: DIGICOOK_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    if (!response.ok) {
      const raw = await response.text();
      lastError = `Gemini stream failed (${response.status}) on ${model}: ${raw}`;
      if (response.status === 404) continue;
      throw new Error(lastError);
    }

    if (!response.body) {
      throw new Error(`Gemini stream returned no body for model ${model}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const payload = event
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n")
          .trim();

        if (!payload || payload === "[DONE]") continue;

        try {
          const data = JSON.parse(payload) as any;
          const text = (data?.candidates?.[0]?.content?.parts ?? [])
            .map((p: any) => p?.text ?? "")
            .join("");

          if (!text) continue;

          fullText += text;
          onChunk(text);
        } catch {
          // Ignore malformed event chunks and continue.
        }
      }
    }

    // Parse any trailing buffered event.
    if (buffer.trim()) {
      const payload = buffer
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n")
        .trim();

      if (payload && payload !== "[DONE]") {
        try {
          const data = JSON.parse(payload) as any;
          const text = (data?.candidates?.[0]?.content?.parts ?? [])
            .map((p: any) => p?.text ?? "")
            .join("");
          if (text) {
            fullText += text;
            onChunk(text);
          }
        } catch {
          // ignore trailing parse failure
        }
      }
    }

    if (!fullText.trim()) {
      lastError = `Gemini stream returned an empty response for model ${model}.`;
      continue;
    }

    return { text: fullText, model };
  }

  throw new Error(lastError || "No compatible Gemini model was found for this API key/project.");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      if (isRateLimited(ip)) {
        return res.status(429).json({
          message: "Rate limit reached. Please wait and try again.",
        });
      }

      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const normalized: ChatMessage[] = rawMessages
        .map((m: any) => ({
          role: m?.role === "assistant" ? "assistant" : "user",
          content: typeof m?.content === "string" ? m.content.trim() : "",
        }))
        .filter((m: ChatMessage) => m.content.length > 0)
        .slice(-12);

      if (normalized.length === 0) {
        return res.status(400).json({ message: "At least one message is required." });
      }

      const userChars = normalized
        .filter((m) => m.role === "user")
        .reduce((sum, m) => sum + m.content.length, 0);
      if (userChars > 8000) {
        return res.status(400).json({ message: "Input is too long." });
      }

      let result: { text: string; model: string };
      if (shouldPreferOllama()) {
        result = await callOllama(normalized);
      } else {
        try {
          result = await callGemini(normalized);
        } catch (err) {
          if (isQuotaLikeError(err)) {
            result = await callOllama(normalized);
          } else {
            throw err;
          }
        }
      }
      return res.json({
        reply: result.text,
        model: result.model,
      });
    } catch (err: any) {
      console.error("AI chat error:", err);
      return res.status(500).json({
        message: err?.message || "AI request failed.",
      });
    }
  });

  app.post("/api/ai/chat/stream", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      if (isRateLimited(ip)) {
        return res.status(429).json({
          message: "Rate limit reached. Please wait and try again.",
        });
      }

      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const normalized: ChatMessage[] = rawMessages
        .map((m: any) => ({
          role: m?.role === "assistant" ? "assistant" : "user",
          content: typeof m?.content === "string" ? m.content.trim() : "",
        }))
        .filter((m: ChatMessage) => m.content.length > 0)
        .slice(-12);

      if (normalized.length === 0) {
        return res.status(400).json({ message: "At least one message is required." });
      }

      const userChars = normalized
        .filter((m) => m.role === "user")
        .reduce((sum, m) => sum + m.content.length, 0);
      if (userChars > 8000) {
        return res.status(400).json({ message: "Input is too long." });
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let wroteChunk = false;

      const writeChunk = (chunk: string) => {
        if (!chunk) return;
        wroteChunk = true;
        res.write(chunk);
      };

      if (shouldPreferOllama()) {
        await callOllamaStream(normalized, writeChunk);
      } else {
        try {
          await callGeminiStream(normalized, writeChunk);
        } catch (streamErr) {
          // If Gemini streaming produced no visible text, gracefully fall back.
          if (!wroteChunk) {
            if (isQuotaLikeError(streamErr)) {
              await callOllamaStream(normalized, writeChunk);
            } else {
              const fallback = await callGemini(normalized);
              if (fallback.text?.trim()) {
                writeChunk(fallback.text);
              }
            }
          } else {
            throw streamErr;
          }
        }
  
        // Safety net for edge-cases where stream completes but yields no text chunks.
        if (!wroteChunk) {
          try {
            const fallback = await callGemini(normalized);
            if (fallback.text?.trim()) {
              writeChunk(fallback.text);
            }
          } catch (fallbackErr) {
            if (isQuotaLikeError(fallbackErr)) {
              await callOllamaStream(normalized, writeChunk);
            } else {
              throw fallbackErr;
            }
          }
        }
      }

      return res.end();
    } catch (err: any) {
      console.error("AI chat stream error:", err);
      if (!res.headersSent) {
        return res.status(500).json({
          message: err?.message || "AI streaming request failed.",
        });
      }
      res.end();
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
