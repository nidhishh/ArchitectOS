import { KnowledgeGraph } from "../graph/KnowledgeGraph";
import { TypeScriptParser } from "./languages/TypeScriptParser";

export interface FileEntry {
  path: string;
  content: string;
}

export class RepositoryParser {
  private static TS_JS_EXTENSIONS = new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
  ]);

  static parseRepository(files: FileEntry[], graph: KnowledgeGraph): {
    parsedFiles: number;
    skippedFiles: number;
    errors: number;
  } {
    let parsedFiles = 0;
    let skippedFiles = 0;
    let errors = 0;

    for (const file of files) {
      const ext = this.getExtension(file.path);
      if (!this.TS_JS_EXTENSIONS.has(ext)) {
        skippedFiles++;
        continue;
      }

      try {
        TypeScriptParser.parse(file.path, file.content, graph);
        parsedFiles++;
      } catch (err) {
        errors++;
        console.error(`Failed parsing file ${file.path}:`, err);
      }
    }

    return { parsedFiles, skippedFiles, errors };
  }

  private static getExtension(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const dot = normalized.lastIndexOf(".");
    if (dot < 0) return "";
    return normalized.slice(dot).toLowerCase();
  }
}
