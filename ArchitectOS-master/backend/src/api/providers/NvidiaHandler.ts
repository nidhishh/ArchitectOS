import { ApiHandler, ApiHandlerOptions } from "../ApiHandler";

export class NvidiaHandler implements ApiHandler {
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    const cleanEnvVal = (val: string) => {
      let cleaned = val.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      return cleaned.trim();
    };

    this.baseUrl = cleanEnvVal(process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1");
    this.apiKey = cleanEnvVal(process.env.NVIDIA_API_KEY || "");
    this.defaultModel = cleanEnvVal(process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro");
  }


  async createMessage(systemPrompt: string, userPrompt: string, options?: ApiHandlerOptions): Promise<string> {
    const model = options?.model || this.defaultModel;

    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY is not defined in environment variables.");
    }

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const payload: any = {
      model: model,
      messages: messages,
      temperature: options?.temperature ?? (options?.jsonMode ? 0.3 : 0.7),
      max_tokens: options?.maxTokens || 4096,
      stream: false,
      chat_template_kwargs: {
        thinking: false
      }
    };

    if (options?.jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from NVIDIA AI");

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
