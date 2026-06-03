import { ApiHandler } from "../api/ApiHandler";
import { KnowledgeGraph } from "../graph/KnowledgeGraph";
import path from "path";

export interface ExtractorStats {
  parsedFiles: number;
  skippedFiles: number;
  errors: number;
}

export class ArchitectureExtractor {
  static async extractArchitecture(
    files: { path: string; content: string }[],
    graph: KnowledgeGraph,
    stats: ExtractorStats,
    api: ApiHandler
  ): Promise<any> {
    const fileList = files.map((f) => `${f.path} (${f.content.length} chars)`).join("\n");
    const codeSnippets = files
      .slice(0, 15)
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 500)}`)
      .join("\n\n");

    const astSummary = this.buildAstSummaryFromGraph(graph, stats);

    // Step 1: High-level System Extraction Prompt
    const systemPrompt = `You are ArchitectOS, an expert Staff Architect agent. 
Analyze the codebase static structure, files, and AST call graphs to build a hierarchical architecture JSON.

Return ONLY valid JSON matching this exact schema:
{
  "id": "root-id",
  "title": "Project Name",
  "description": "High level system description",
  "depth": 0,
  "type": "project",
  "path": "",
  "code": "",
  "children": [
    {
      "id": "module-id",
      "title": "Subsystem/Layer Title",
      "description": "Subsystem 1-2 sentence description",
      "depth": 1,
      "type": "module",
      "path": "",
      "code": "",
      "children": [
        {
          "id": "file-node-id",
          "title": "File/Component Title",
          "description": "Brief description of the component's purpose based on its code/classes",
          "depth": 2,
          "type": "file",
          "path": "actual/file/path.ts",
          "code": "A brief, key code snippet from this component (max 15 lines)",
          "children": []
        }
      ]
    }
  ]
}

Rules:
- Do not output any markdown code fences, comments, or explanations outside the JSON object.
- Group the files logically into 3-6 top-level subsystems/layers based on import and call dependencies (e.g. controllers, services, middleware, utilities).
- Ensure every actual file path in the workspace is assigned to its logical parent subsystem.
- Use the provided AST call relationships to describe how components interact.`;

    const userPrompt = `File list:\n${fileList}\n\nCode snippets:\n${codeSnippets}\n\n${astSummary}\n\nIdentify the subsystems, assign all files to their correct subsystems, extract descriptions and code snippets, and output the hierarchical architecture JSON.`;

    console.log("[Extractor] Spawning LLM extraction loop...");
    const content = await api.createMessage(systemPrompt, userPrompt, {
      maxTokens: 6000,
      jsonMode: true,
      temperature: 0.3,
    });

    try {
      const parsed = this.extractJsonFromResponse(content);
      const sanitized = this.sanitizeNode(parsed);
      
      // Step 2: Validate and Repair (Ensure all files in graph are accounted for)
      this.repairMissingFiles(sanitized, files);

      return sanitized;
    } catch (e: any) {
      console.error("[Extractor] JSON parsing failed, executing fallback repair...", e.message);
      throw new Error(`ArchitectureExtractor failed: ${e.message}`);
    }
  }

  private static buildAstSummaryFromGraph(graph: KnowledgeGraph, stats: ExtractorStats): string {
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

  private static extractJsonFromResponse(raw: string): any {
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

  private static sanitizeNode(node: any): any {
    return {
      id: node?.id || "node-" + Math.random().toString(36).slice(2, 8),
      title: node?.title || "Untitled",
      description: node?.description || "",
      depth: node?.depth || 0,
      type: node?.type || "module",
      path: node?.path || "",
      code: node?.code || "",
      children: Array.isArray(node?.children) ? node.children.map((c: any) => this.sanitizeNode(c)) : [],
    };
  }

  private static repairMissingFiles(root: any, allFiles: { path: string; content: string }[]) {
    // 1. Gather all file paths in the generated tree
    const mappedPaths = new Set<string>();
    const traverse = (node: any) => {
      if (node.type === "file" && node.path) {
        mappedPaths.add(node.path.replace(/\\/g, "/"));
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(root);

    // 2. Identify missing files
    const missingFiles = allFiles.filter(
      (f) => !mappedPaths.has(f.path.replace(/\\/g, "/"))
    );

    if (missingFiles.length === 0) return;

    console.log(`[Extractor] Repairing: found ${missingFiles.length} unassigned files. Appending to 'Other Components'.`);

    // 3. Find or create an "Other Components" module
    let otherModule = root.children.find(
      (c: any) => c.title.toLowerCase() === "other components" || c.id === "other-components"
    );

    if (!otherModule) {
      otherModule = {
        id: "other-components",
        title: "Other Components",
        description: "Miscellaneous system files and utility modules.",
        depth: 1,
        type: "module",
        path: "",
        code: "",
        children: [],
      };
      root.children.push(otherModule);
    }

    // 4. Append missing files
    missingFiles.forEach((file) => {
      otherModule.children.push({
        id: "file-" + path.basename(file.path).replace(/[^a-z0-9-_]/gi, "-").toLowerCase(),
        title: path.basename(file.path),
        description: `Source file at ${file.path}`,
        depth: 2,
        type: "file",
        path: file.path,
        code: file.content.slice(0, 500),
        children: [],
      });
    });
  }
}
