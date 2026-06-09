import { OllamaHandler } from "./providers/OllamaHandler";
import { NvidiaHandler } from "./providers/NvidiaHandler";

export interface ApiHandlerOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ApiHandler {
  createMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: ApiHandlerOptions
  ): Promise<string>;
}

export function buildApiHandler(): ApiHandler {
  const provider = process.env.AI_PROVIDER || "ollama";
  if (provider.toLowerCase() === "nvidia") {
    return new NvidiaHandler();
  }
  return new OllamaHandler();
}

