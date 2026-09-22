// ─── LLM Provider Abstraction Layer ──────────────────────────────────────────
// Supports: Ollama (local), Groq (free cloud), vLLM (production GPU)
// Set LLM_PROVIDER env var to switch providers transparently

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMResponse = {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type LLMStreamChunk = {
  delta: string;
  done: boolean;
};

// ─── Base chat completion (non-streaming) ─────────────────────────────────────
export async function llmChat(
  messages: LLMMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  } = {}
): Promise<LLMResponse> {
  const provider = process.env.LLM_PROVIDER ?? "groq";

  if (provider === "ollama") {
    return ollamaChat(messages, options);
  } else if (provider === "vllm") {
    return vllmChat(messages, options);
  } else {
    return groqChat(messages, options);
  }
}

// ─── Streaming chat completion ────────────────────────────────────────────────
export async function* llmStream(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number } = {}
): AsyncGenerator<LLMStreamChunk> {
  const provider = process.env.LLM_PROVIDER ?? "groq";

  if (provider === "ollama") {
    yield* ollamaStream(messages, options);
  } else if (provider === "vllm") {
    yield* vllmStream(messages, options);
  } else {
    yield* groqStream(messages, options);
  }
}

// ─── Embedding generation ─────────────────────────────────────────────────────
export async function llmEmbed(text: string): Promise<number[]> {
  const provider = process.env.LLM_PROVIDER ?? "groq";

  if (provider === "ollama") {
    return ollamaEmbed(text);
  }
  // Fallback: use a simple hash-based embedding for non-Ollama providers
  // In production, plug in a dedicated embedding API
  return ollamaEmbed(text);
}

// ─── Ollama Implementation ────────────────────────────────────────────────────
async function ollamaChat(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number; json_mode?: boolean }
): Promise<LLMResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.max_tokens ?? 2048,
      },
      format: options.json_mode ? "json" : undefined,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return {
    content: data.message?.content ?? "",
    usage: {
      prompt_tokens: data.prompt_eval_count ?? 0,
      completion_tokens: data.eval_count ?? 0,
      total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    },
  };
}

async function* ollamaStream(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number }
): AsyncGenerator<LLMStreamChunk> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: options.temperature ?? 0.7 },
    }),
  });

  if (!res.ok || !res.body) throw new Error(`Ollama stream error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        yield {
          delta: parsed.message?.content ?? "",
          done: parsed.done ?? false,
        };
        if (parsed.done) return;
      } catch {
        // skip malformed lines
      }
    }
  }
}

async function ollamaEmbed(text: string): Promise<number[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

  const res = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
  const data = await res.json();
  return data.embedding ?? [];
}

// ─── Groq Implementation ──────────────────────────────────────────────────────
async function groqChat(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number; json_mode?: boolean }
): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
  };

  if (options.json_mode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage,
  };
}

async function* groqStream(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number }
): AsyncGenerator<LLMStreamChunk> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) throw new Error(`Groq stream error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        yield { delta: "", done: true };
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        yield { delta, done: false };
      } catch {
        // skip
      }
    }
  }
}

// ─── vLLM Implementation (OpenAI-compatible) ──────────────────────────────────
async function vllmChat(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number; json_mode?: boolean }
): Promise<LLMResponse> {
  const baseUrl = process.env.VLLM_BASE_URL ?? "http://localhost:8000";
  const model =
    process.env.VLLM_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct";

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    }),
  });

  if (!res.ok) throw new Error(`vLLM error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage,
  };
}

async function* vllmStream(
  messages: LLMMessage[],
  options: { temperature?: number; max_tokens?: number }
): AsyncGenerator<LLMStreamChunk> {
  // vLLM uses OpenAI-compatible SSE — same as Groq stream
  yield* groqStream(messages, options);
}

// ─── JSON Output Parser (with retry) ─────────────────────────────────────────
export async function llmJSON<T>(
  messages: LLMMessage[],
  options: { temperature?: number; retries?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await llmChat(messages, {
        temperature: options.temperature ?? 0.2,
        json_mode: true,
      });

      // Strip markdown code fences if present
      const cleaned = response.content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      // Add explicit JSON reminder on retry
      messages = [
        ...messages,
        {
          role: "assistant",
          content: "Let me provide the response in valid JSON format:",
        },
      ];
    }
  }

  throw new Error("LLM JSON parsing failed after retries");
}
