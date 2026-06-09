import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import multer from "multer";
import { buildApiHandler } from "./src/api/ApiHandler";
import { KnowledgeGraph } from "./src/graph/KnowledgeGraph";
import { RepositoryParser } from "./src/parser/RepositoryParser";
import { ArchitectureExtractor } from "./src/extractor/ArchitectureExtractor";

dotenv.config();

const app = express();
app.use(cors());
const apiHandler = buildApiHandler();
const globalGraph = new KnowledgeGraph();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const AI_ENABLED = process.env.AI_ENABLED === "true";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const OLLAMA_TIMEOUT_MS = 300_000; // 5 minutes
const ANALYZE_TIMEOUT_MS = 300_000; // 5 minutes
const NODE_CHAT_TIMEOUT_MS = 60_000; // 1 minute

function isAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || /aborted/i.test(err.message);
}

function rethrowIfTimeout(err: unknown, timeoutMs: number): never {
  if (isAbortError(err)) {
    const minutes = timeoutMs / 60_000;
    const label = minutes === 1 ? "1 minute" : `${minutes} minutes`;
    throw new Error(
      `Request timed out after ${label}. Try a lower autonomy level or a shorter prompt.`
    );
  }
  throw err;
}

const upload = multer({ dest: "/tmp/architect-os-uploads/" });

function buildAstSummaryFromGraph(
  graph: KnowledgeGraph,
  stats: { parsedFiles: number; skippedFiles: number; errors: number }
): string {
  const maxNodes = 120;
  const maxEdges = 200;

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const nodeLines = nodes
    .filter((n) => n.type === "class" || n.type === "function")
    .slice(0, maxNodes)
    .map((node) => {
      if (node.type === "class") {
        const extendsText = node.properties.superClass ? ` extends ${node.properties.superClass}` : "";
        return `[CLASS] ${node.name}${extendsText} @ ${node.properties.filePath}`;
      }
      const params = node.properties.params?.join(", ") || "";
      return `[FUNCTION] ${node.name}(${params}) async=${Boolean(node.properties.isAsync)} @ ${node.properties.filePath}`;
    });

  const edgeLines = edges
    .slice(0, maxEdges)
    .map((edge) => {
      const filePathText = edge.properties?.filePath ? ` @ ${edge.properties.filePath}` : "";
      return `${edge.from} -[${edge.type}]-> ${edge.to}${filePathText}`;
    });

  return `AST Summary
- parsedFiles: ${stats.parsedFiles}
- skippedFiles: ${stats.skippedFiles}
- parseErrors: ${stats.errors}
- nodesFound: ${nodes.length}
- edgesFound: ${edges.length}

AST Nodes (truncated):
${nodeLines.join("\n") || "(none)"}

AST Edges (truncated):
${edgeLines.join("\n") || "(none)"}`;
}

// ── Sanitize node tree ─────────────────────────────────────────────
function sanitizeNode(node: any): any {
  return {
    id: node?.id || "node-" + Math.random().toString(36).slice(2, 8),
    title: node?.title || "Untitled",
    description: node?.description || "",
    depth: node?.depth || 1,
    code: node?.code || "",
    children: Array.isArray(node?.children) ? node.children.map(sanitizeNode) : [],
  };
}

// ── Mock fallback ──────────────────────────────────────────────────
function loadMockArchitecture() {
  const filePath = path.join(process.cwd(), "mock", "mockArchitecture.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}



// ── Generate architecture ──────────────────────────────────────────
async function generateArchitecture(prompt: string, level: number, syntax: string) {
  const levelNames: Record<number, string> = {
    1: "Beginner — high-level system overview. Generate exactly 1 depth level with 3-5 child nodes under root.",
    2: "Intermediate — subsystems and data flow. Generate exactly 2 depth levels. Root has 4-6 children, each child has 2-4 children.",
    3: "Advanced — internal mechanisms, auth, protocols. Generate exactly 3 depth levels. Be thorough with 10-20 total nodes.",
    4: "Expert — full implementation detail. Generate exactly 4 depth levels. Include algorithmic and data structure detail. 15-30 total nodes.",
  };

  const levelDesc = levelNames[level] || levelNames[2];

  let syntaxInstruction = "";
  if (syntax === "Show Pseudocode") {
    syntaxInstruction = `\n- Add a "code" field to EVERY node containing pseudocode (3-10 lines) showing the logic of that component. Use clear variable names and comments.`;
  } else if (syntax === "Show Real Code") {
    syntaxInstruction = `\n- Add a "code" field to EVERY node containing real, working code (3-15 lines, language relevant to the system) implementing that component's core logic.`;
  }

  const systemPrompt = `You are ArchitectOS, an AI that decomposes software systems into architecture graphs.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown, no explanations, no text outside JSON.
- Schema: { "id": "string", "title": "string", "description": "string", "depth": number, "children": [...]${syntax !== "Hide Syntax" ? ', "code": "string"' : ""} }
- "id" must be unique kebab-case.
- "depth" starts at 1 for root and increments per level.
- Maximum depth: ${level}. You MUST use ALL ${level} levels of depth.
- Root node (depth 1) MUST have children.
- Nodes at depth ${level} have empty children [].
- Nodes at depth < ${level} MUST have 2+ children each.
- Decompose logically: each node = real architectural component.
- Descriptions: 1-2 concise sentences.${syntaxInstruction}

Autonomy: ${levelDesc}`;

  const raw = await apiHandler.createMessage(systemPrompt, prompt, {
    maxTokens: syntax !== "Hide Syntax" ? 6000 : 4096,
    jsonMode: true,
  });

  try {
    const parsed = extractJsonFromResponse(raw);
    if (!parsed.id || !parsed.title) throw new Error("Missing required fields");
    return sanitizeNode(parsed);
  } catch (e) {
    console.error("Failed to parse AI response:", raw.slice(0, 500));
    const truncated = raw.includes("{") && !raw.trim().endsWith("}");
    throw new Error(
      truncated
        ? "AI response was cut off (too large). Try Beginner level or Hide Syntax."
        : "AI returned invalid JSON. Try again."
    );
  }
}

// ── Generate README ────────────────────────────────────────────────
async function generateReadme(architecture: any, prompt: string): Promise<string> {
  const systemPrompt = `You are a technical writer. Given an architecture JSON and the original prompt, write a comprehensive README.md for a GitHub repository.

RULES:
- Return ONLY a JSON object: { "readme": "..." }
- The readme field contains the full markdown README.
- Include: Project title, description, architecture overview, how each component works, setup instructions, file structure, and usage.
- Write in clear, friendly English.
- Use proper markdown formatting with headers, lists, code blocks.
- Make it look professional — like a real open-source project README.`;

  const userPrompt = `Original prompt: "${prompt}"

Architecture:
${JSON.stringify(architecture, null, 2)}`;

  const raw = await apiHandler.createMessage(systemPrompt, userPrompt, {
    maxTokens: 4096,
    jsonMode: false,
  });

  try {
    const parsed = JSON.parse(raw);
    return parsed.readme || parsed.content || raw;
  } catch {
    return raw;
  }
}

// ── Generate file structure from architecture ──────────────────────
function generateFileStructure(arch: any, basePath = ""): string[] {
  const files: string[] = [];
  const dirName = arch.id.replace(/[^a-z0-9-_]/gi, "-");
  const currentPath = basePath ? `${basePath}/${dirName}` : dirName;

  if (arch.code) {
    files.push(`${currentPath}/index.ts`);
  }

  if (arch.children && arch.children.length > 0) {
    for (const child of arch.children) {
      files.push(...generateFileStructure(child, currentPath));
    }
  } else {
    if (!arch.code) {
      files.push(`${currentPath}/index.ts`);
    }
  }

  return files;
}

// ── Extract JSON from LLM response (handles markdown, preamble, etc.) ─
function extractJsonFromResponse(raw: string): any {
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
  return JSON.parse(cleaned);
}

// ── Build simple file-tree architecture (no AI) ─────────────────────
function buildFileTreeArchitecture(files: { path: string; content: string }[]): any {
  const root: any = {
    id: "root",
    title: "Uploaded Codebase",
    description: `Codebase with ${files.length} files`,
    depth: 1,
    code: "",
    children: [],
  };
  const dirMap = new Map<string, any>();
  dirMap.set("", root);

  for (const f of files) {
    const parts = f.path.replace(/\\/g, "/").split("/");
    const fileName = parts.pop()!;
    let parentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const fullPath = parentPath ? `${parentPath}/${seg}` : seg;
      if (!dirMap.has(fullPath)) {
        const node: any = {
          id: seg.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() + "-" + Math.random().toString(36).slice(2, 6),
          title: seg,
          description: `Directory: ${seg}`,
          depth: i + 2,
          code: "",
          children: [],
        };
        const parent = dirMap.get(parentPath);
        if (parent) parent.children.push(node);
        dirMap.set(fullPath, node);
      }
      parentPath = fullPath;
    }
    const parent = dirMap.get(parentPath) || root;
    parent.children.push({
      id: fileName.replace(/[^a-z0-9-_]/gi, "-") + "-" + Math.random().toString(36).slice(2, 6),
      title: fileName,
      description: f.path,
      depth: parts.length + 2,
      code: f.content.slice(0, 2000),
      children: [],
    });
  }
  return sanitizeNode(root);
}

// ── Analyze uploaded codebase ──────────────────────────────────────
async function analyzeCodebase(files: { path: string; content: string }[]) {
  if (!AI_ENABLED) {
    return buildFileTreeArchitecture(files);
  }

  // Clear and rebuild global graph
  globalGraph.clear();
  const stats = RepositoryParser.parseRepository(files, globalGraph);

  try {
    const result = await ArchitectureExtractor.extractArchitecture(files, globalGraph, stats, apiHandler);
    return result;
  } catch (err) {
    rethrowIfTimeout(err, ANALYZE_TIMEOUT_MS);
  }
}

// ── Routes ─────────────────────────────────────────────────────────

// Generate architecture
app.post("/generate", async (req, res) => {
  const { prompt, level, syntax } = req.body || {};
  if (!prompt || typeof level !== "number") {
    return res.status(400).json({ error: "Need { prompt, level }" });
  }
  try {
    let result;
    if (AI_ENABLED) {
      console.log(`[AI] Generating: "${prompt}" level=${level} syntax=${syntax || "Hide Syntax"}`);
      result = await generateArchitecture(prompt, level, syntax || "Hide Syntax");
      console.log(`[AI] Done.`);
    } else {
      result = loadMockArchitecture();
    }
    return res.json(result);
  } catch (error: any) {
    console.error("Generation error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Generate README
app.post("/readme", async (req, res) => {
  const { architecture, prompt } = req.body || {};
  if (!architecture) return res.status(400).json({ error: "Need architecture" });
  try {
    console.log(`[AI] Generating README...`);
    const readme = await generateReadme(architecture, prompt || "");
    console.log(`[AI] README done.`);
    return res.json({ readme });
  } catch (error: any) {
    console.error("README error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Upload codebase_most important feature
app.post("/upload", upload.single("zipfile"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Read the uploaded file as text entries
    const filePath = req.file.path;
    const entries = req.body.entries ? JSON.parse(req.body.entries) : [];

    if (!entries.length) {
      return res.status(400).json({ error: "No file entries provided" });
    }

    console.log(`[AI] Analyzing ${entries.length} files...`);
    const result = await analyzeCodebase(entries);
    console.log(`[AI] Analysis done.`);

    // Cleanup
    fs.unlinkSync(filePath);
    return res.json(result);
  } catch (error: any) {
    console.error("Upload error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Upload as JSON (for frontend ZIP reading)
app.post("/analyze", async (req, res) => {
  const { files } = req.body || {};
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Need { files: [{path, content}] }" });
  }
  try {
    console.log(`[AI] Analyzing ${files.length} files...`);
    const result = await analyzeCodebase(files);
    console.log(`[AI] Analysis done.`);
    return res.json(result);
  } catch (error: any) {
    console.error("[Upload Codebase] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// AST preview only (no LLM call)
app.post("/ast-preview", (req, res) => {
  const { files } = req.body || {};
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Need { files: [{path, content}] }" });
  }

  try {
    const tempGraph = new KnowledgeGraph();
    const stats = RepositoryParser.parseRepository(files, tempGraph);
    return res.json({
      ast: {
        nodes: tempGraph.getNodes(),
        edges: tempGraph.getEdges(),
      },
      promptSummary: buildAstSummaryFromGraph(tempGraph, stats),
    });
  } catch (error: any) {
    console.error("[AST Preview] Error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to build AST preview" });
  }
});

// Expose Knowledge Graph data to client
app.get("/graph", (_req, res) => {
  return res.json({
    nodes: globalGraph.getNodes(),
    edges: globalGraph.getEdges(),
  });
});

// File structure
app.post("/file-structure", (req, res) => {
  const { architecture } = req.body || {};
  if (!architecture) return res.status(400).json({ error: "Need architecture" });
  const files = generateFileStructure(architecture);
  return res.json({ files });
});

// Node AI chat
app.post("/node-chat", async (req, res) => {
  const { node, message, history } = req.body || {};
  if (!node || !message) return res.status(400).json({ error: "Need node and message" });

  try {
    const systemPrompt = `You are an AI architecture assistant. You are focused on ONE specific node in an architecture graph.

Node: "${node.title}"
Description: "${node.description}"
${node.code ? `Code:\n${node.code}` : ""}

RULES:
- Answer questions ONLY about this specific node.
- If the user asks you to change something, return a JSON field "updatedNode" with the modified node (same schema: id, title, description, code).
- For explanations, just give clear text. Be concise.
- If the user asks to change the title, description, or code, include "updatedNode" in your response.
- Return JSON: { "reply": "your text answer", "updatedNode": null | { id, title, description, code } }`;

    const chatHistory = (history || []).map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nChat History:\n${chatHistory}\n\nUser: ${message}`;

    try {
      const content = await apiHandler.createMessage("", fullPrompt, {
        maxTokens: 2048,
        jsonMode: true,
        temperature: 0.7,
      });

      const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

      try {
        const parsed = JSON.parse(cleaned);
        return res.json({
          reply: parsed.reply || parsed.answer || cleaned,
          updatedNode: parsed.updatedNode || null,
        });
      } catch {
        return res.json({ reply: cleaned, updatedNode: null });
      }
    } catch (err) {
      rethrowIfTimeout(err, NODE_CHAT_TIMEOUT_MS);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Health
app.get("/health", async (_req, res) => {
  const provider = process.env.AI_PROVIDER || "ollama";
  let aiOk = false;
  if (provider.toLowerCase() === "nvidia") {
    aiOk = !!process.env.NVIDIA_API_KEY;
  } else {
    try {
      const r = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      aiOk = r.ok;
    } catch { }
  }

  const model = provider.toLowerCase() === "nvidia"
    ? (process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro")
    : OLLAMA_MODEL;

  res.json({
    status: "ok",
    ai: AI_ENABLED,
    provider,
    aiOk,
    model
  });
});

app.listen(PORT, () => {
  const provider = process.env.AI_PROVIDER || "ollama";
  const model = provider.toLowerCase() === "nvidia"
    ? (process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro")
    : OLLAMA_MODEL;

  console.log(`Backend on http://localhost:${PORT}`);
  console.log(`AI: ${AI_ENABLED ? "ENABLED (" + provider + " - " + model + ")" : "DISABLED (chutiya)"}`);
});

