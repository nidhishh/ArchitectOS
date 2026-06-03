import { ApiHandler, ApiHandlerOptions } from "../ApiHandler";

export class OllamaHandler implements ApiHandler {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_MODEL || "llama3.1:8b";
  }

  async createMessage(systemPrompt: string, userPrompt: string, options?: ApiHandlerOptions): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const model = options?.model || this.defaultModel;
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false,
        ...(options?.jsonMode ? { format: "json" } : {}),
        options: { 
          temperature: options?.temperature ?? (options?.jsonMode ? 0.3 : 0.7), 
          num_predict: options?.maxTokens || 4096 
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.response;
    if (!content) throw new Error("Empty response from AI");

    return this.cleanJsonResponse(content, options?.jsonMode);
  }

  private cleanJsonResponse(raw: string, jsonMode?: boolean): string {
    if (!jsonMode) return raw;
    let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace >= 0) {
      let depth = 0;
      let end = -1;
      for (let i = firstBrace; i < cleaned.length; i++) {
        if (cleaned[i] === "{") depth++;
        if (cleaned[i] === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end >= 0) cleaned = cleaned.slice(firstBrace, end + 1);
    }
    return cleaned;
  }
}
