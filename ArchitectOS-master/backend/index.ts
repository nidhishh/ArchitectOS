import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import multer from "multer";
import * as babelParser from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse: any = (traverseModule as any).default || traverseModule;

dotenv.config();

const app = express();
app.use(cors());
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

const AST_SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
]);

type AstNodeSummary = {
  type: "class" | "function";
  name: string;
  filePath: string;
  superClass?: string | null;
  methods?: string[];
  params?: string[];
  isAsync?: boolean;
};

type AstEdgeSummary = {
  type: "imports" | "extends" | "calls" | "exports";
  from: string;
  to: string;
  filePath: string;
};

type AstGraphSummary = {
  parsedFiles: number;
  skippedFiles: number;
  errors: number;
  nodes: AstNodeSummary[];
  edges: AstEdgeSummary[];
};

function getExtension(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const dot = normalized.lastIndexOf(".");
  if (dot < 0) return "";
  return normalized.slice(dot).toLowerCase();
}

function collectAstFromFile(filePath: string, code: string): AstGraphSummary {
  const nodes: AstNodeSummary[] = [];
  const edges: AstEdgeSummary[] = [];
  const ast = babelParser.parse(code, {
    sourceType: "unambiguous",
    errorRecovery: true,
    plugins: [
      "typescript",
      "jsx",
      "classProperties",
      "decorators-legacy",
      "dynamicImport",
      "importMeta",
      "topLevelAwait",
    ],
  });

  traverse(ast, {
    ImportDeclaration(path: any) {
      const source = path.node.source.value;
      if (!source) return;
      edges.push({
        type: "imports",
        from: filePath,
        to: String(source),
        filePath,
      });
    },
    ClassDeclaration(path: any) {
      const className = path.node.id?.name;
      if (!className) return;
      const methods = path.node.body.body
        .filter((m: any) => m.type === "ClassMethod")
        .map((m: any) => `${m.async ? "async " : ""}${m.key?.name || "anonymous"}()`);
      const superClass =
        path.node.superClass && path.node.superClass.type === "Identifier"
          ? path.node.superClass.name
          : null;

      nodes.push({
        type: "class",
        name: className,
        filePath,
        superClass,
        methods,
      });

      if (superClass) {
        edges.push({ type: "extends", from: className, to: superClass, filePath });
      }
    },
    FunctionDeclaration(path: any) {
      const fnName = path.node.id?.name;
      if (!fnName) return;
      const params = path.node.params.map((p: any) => {
        if (p.type === "Identifier") return p.name;
        return "param";
      });
      nodes.push({
        type: "function",
        name: fnName,
        filePath,
        params,
        isAsync: Boolean(path.node.async),
      });
    },
    CallExpression(path: any) {
      const callee = path.node.callee;
      let calleeName: string | null = null;
      if (callee.type === "Identifier") calleeName = callee.name;
      if (callee.type === "MemberExpression" && callee.property?.type === "Identifier") {
        calleeName = callee.property.name;
      }
      if (!calleeName) return;

      let callerName = "(top-level)";
      let ancestor = path.parentPath;
      while (ancestor) {
        if (ancestor.node.type === "ClassMethod") {
          callerName = (ancestor.node as any).key?.name || callerName;
          break;
        }
        if (ancestor.node.type === "FunctionDeclaration") {
          callerName = (ancestor.node as any).id?.name || callerName;
          break;
        }
        ancestor = ancestor.parentPath;
      }

      edges.push({ type: "calls", from: callerName, to: calleeName, filePath });
    },
    ExportDefaultDeclaration(path: any) {
      const decl: any = path.node.declaration;
      const name = decl?.id?.name || "default";
      edges.push({ type: "exports", from: filePath, to: name, filePath });
    },
    ExportNamedDeclaration(path: any) {
      const names = (path.node.specifiers || [])
        .map((s: any) => s?.exported?.name)
        .filter(Boolean);
      names.forEach((name: string) => {
        edges.push({ type: "exports", from: filePath, to: name, filePath });
      });
    },
  });

  return {
    parsedFiles: 1,
    skippedFiles: 0,
    errors: 0,
    nodes,
    edges,
  };
}

function buildAstGraphSummary(files: { path: string; content: string }[]): AstGraphSummary {
  const merged: AstGraphSummary = {
    parsedFiles: 0,
    skippedFiles: 0,
    errors: 0,
    nodes: [],
    edges: [],
  };

  for (const file of files) {
    const extension = getExtension(file.path);
    if (!AST_SUPPORTED_EXTENSIONS.has(extension)) {
      merged.skippedFiles++;
      continue;
    }
    try {
      const summary = collectAstFromFile(file.path, file.content);
      merged.parsedFiles += summary.parsedFiles;
      merged.nodes.push(...summary.nodes);
      merged.edges.push(...summary.edges);
    } catch {
      merged.errors++;
    }
  }

  const seen = new Set<string>();
  merged.edges = merged.edges.filter((edge) => {
    const key = `${edge.type}:${edge.filePath}:${edge.from}->${edge.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return merged;
}

function astSummaryForPrompt(ast: AstGraphSummary): string {
  const maxNodes = 120;
  const maxEdges = 200;
  const nodeLines = ast.nodes.slice(0, maxNodes).map((node) => {
    if (node.type === "class") {
      const extendsText = node.superClass ? ` extends ${node.superClass}` : "";
      return `[CLASS] ${node.name}${extendsText} @ ${node.filePath}`;
    }
    const params = node.params?.join(", ") || "";
    return `[FUNCTION] ${node.name}(${params}) async=${Boolean(node.isAsync)} @ ${node.filePath}`;
  });

  const edgeLines = ast.edges.slice(0, maxEdges).map((edge) => {
    return `${edge.from} -[${edge.type}]-> ${edge.to} @ ${edge.filePath}`;
  });

  return `AST Summary
- parsedFiles: ${ast.parsedFiles}
- skippedFiles: ${ast.skippedFiles}
- parseErrors: ${ast.errors}
- nodesFound: ${ast.nodes.length}
- edgesFound: ${ast.edges.length}

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

// ── Call Ollama ────────────────────────────────────────────────────
async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  jsonMode = false
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: fullPrompt,
        stream: false,
        ...(jsonMode ? { format: "json" } : {}),
        options: { temperature: jsonMode ? 0.3 : 0.7, num_predict: maxTokens },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.response;
    if (!content) throw new Error("Empty response from AI");

    return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  } catch (err) {
    rethrowIfTimeout(err, OLLAMA_TIMEOUT_MS);
  } finally {
    clearTimeout(timeout);
  }
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

  const raw = await callOllama(systemPrompt, prompt, syntax !== "Hide Syntax" ? 6000 : 4096, true);

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

  const raw = await callOllama(systemPrompt, userPrompt, 4096);

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

  const astGraph = buildAstGraphSummary(files);
  const fileList = files.map((f) => `${f.path} (${f.content.length} chars)`).join("\n");
  const codeSnippets = files
    .slice(0, 15)
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 500)}`)
    .join("\n\n");

  const systemPrompt = `You are ArchitectOS.

Convert the provided repository tree and code into a hierarchical architecture graph.

Return ONLY valid JSON matching:

{
"id": "",
"title": "",
"description": "",
"depth": 0,
"type": "project|layer|module|component|file",
"path": "",
"code": "",
"children": []
}

Rules:

* Output exactly one JSON object.
* No markdown, code fences, comments, explanations, or extra text.
* Create a single root node representing the project.
* Build hierarchy only from provided files, folders, modules, classes, routes, components, services, and subsystems.
* Never invent architecture, folders, layers, or modules.
* Preserve actual parent-child relationships.
* Prefer logical architectural grouping when clearly supported by code.
* Skip README, lockfiles, generated files, build artifacts, and cache folders.
* Use concise titles based on actual repository names.
* Descriptions must be factual and derived from code.
* code must contain real code snippets copied from input only.
* Maximum 20 lines of code per node.
* Leave code empty if unavailable.
* Infer patterns only when strongly evidenced:

  * Route → Controller → Service
  * Page → Component → Hook
  * API → Middleware → Logic
  * Repository → Model
* Avoid duplicate nodes.
* Merge closely related functionality when appropriate.
* depth starts at 0 for root and increases by exactly 1 per level.
* Small repos: depth 2-3
* Medium repos: depth 3-4
* Large repos: depth 4-5
* Order children by architectural importance when obvious, otherwise preserve repository order.

Every node must contain:

id
title
description
depth
type
path
code
children

Validate before output:

* valid JSON
* single root
* no duplicates
* no hallucinated modules
* consistent depth values
* real code snippets only
`;

  const userPrompt = `File structure:\n${fileList}\n\nCode snippets:\n${codeSnippets}\n\n${astSummaryForPrompt(astGraph)}

Use the AST summary as primary structural evidence for classes, functions, imports, exports, inheritance, and call relationships.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        format: "json",
        options: { temperature: 0.3, num_predict: 6000 },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama error: ${response.status}. Ensure Ollama is running (ollama serve) and model ${OLLAMA_MODEL} is installed.`);
    }
    const data = await response.json();
    const content = (data.response || "").replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!content) throw new Error("Empty response from AI");

    try {
      const parsed = extractJsonFromResponse(content);
      return sanitizeNode(parsed);
    } catch (e) {
      console.error("Analyze JSON parse error:", content.slice(0, 500));
      throw new Error("AI returned invalid JSON. Try fewer/smaller files or a different model.");
    }
  } catch (err) {
    rethrowIfTimeout(err, ANALYZE_TIMEOUT_MS);
  } finally {
    clearTimeout(timeout);
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
    const ast = buildAstGraphSummary(files);
    return res.json({
      ast,
      promptSummary: astSummaryForPrompt(ast),
    });
  } catch (error: any) {
    console.error("[AST Preview] Error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to build AST preview" });
  }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NODE_CHAT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: fullPrompt,
          stream: false,
          format: "json",
          options: { temperature: 0.7, num_predict: 2048 },
        }),
      });
    } catch (err) {
      rethrowIfTimeout(err, NODE_CHAT_TIMEOUT_MS);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error("Ollama error");

    const data = await response.json();
    const content = data.response || "";
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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Health
app.get("/health", async (_req, res) => {
  let ollamaOk = false;
  try { const r = await fetch(`${OLLAMA_BASE_URL}/api/tags`); ollamaOk = r.ok; } catch {}
  res.json({ status: "ok", ai: AI_ENABLED, ollama: ollamaOk, model: OLLAMA_MODEL });
});

app.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
  console.log(`AI: ${AI_ENABLED ? "ENABLED (" + OLLAMA_MODEL + ")" : "DISABLED (chutiya)"}`);
});
