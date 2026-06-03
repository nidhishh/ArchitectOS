import { OllamaHandler } from "./providers/OllamaHandler";

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
  return new OllamaHandler();
}
