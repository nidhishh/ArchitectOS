import { defineStore } from "pinia";
import { generateArchitecture, generateReadme, getFileStructure, analyzeCodebase } from "../services/api";
import { buildGraph, type ArchNode } from "../services/graph";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function findInTree(node: ArchNode, id: string): ArchNode | null {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findInTree(child, id);
    if (found) return found;
  }
  return null;
}

function findParent(node: ArchNode, id: string): ArchNode | null {
  for (const child of node.children || []) {
    if (child.id === id) return node;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

// ── LocalStorage helpers ───────────────────────────────────────────
const STORAGE_KEY = "architectos-state";

function saveToStorage(data: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadFromStorage(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAppStore = defineStore("app", {
  state: () => {
    const saved = loadFromStorage();
    return {
      level: saved?.level ?? 2,
      mode: (saved?.mode ?? "AI Decompose") as "AI Decompose" | "Manual Mode" | "Hybrid",
      syntax: (saved?.syntax ?? "Hide Syntax") as "Hide Syntax" | "Show Pseudocode" | "Show Real Code",
      aiEnabled: saved?.aiEnabled ?? true,
      architecture: (saved?.architecture ?? null) as ArchNode | null,
      nodes: [] as any[],
      edges: [] as any[],
      breadcrumbs: [] as ArchNode[],
      focusId: (saved?.focusId ?? null) as string | null,
      loading: false,
      error: null as string | null,
      lastPrompt: saved?.lastPrompt ?? "",
      // README
      readme: (saved?.readme ?? "") as string,
      readmeStale: false,
      readmeLoading: false,
      readmeVisible: false,
      // File structure
      fileStructure: (saved?.fileStructure ?? []) as string[],
      fileStructureVisible: false,
      // Upload
      uploadLoading: false,
      // History
      history: (saved?.history ?? []) as { prompt: string; timestamp: number }[],
      // Code viewer
      codeViewerVisible: false,
      // Node AI
      activeAINodeId: null as string | null,
    };
  },
  actions: {
    _persist() {
      saveToStorage({
        level: this.level,
        mode: this.mode,
        syntax: this.syntax,
        aiEnabled: this.aiEnabled,
        architecture: this.architecture,
        focusId: this.focusId,
        lastPrompt: this.lastPrompt,
        readme: this.readme,
        fileStructure: this.fileStructure,
        history: this.history.slice(-20),
      });
    },

    _rebuildGraph() {
      if (!this.architecture) return;
      const { nodes, edges, focusPath } = buildGraph(this.architecture, this.focusId || undefined);
      this.nodes = nodes;
      this.edges = edges;
      this.breadcrumbs = focusPath;
    },

    // ── Generate ─────────────────────────────────────────────────
    async generate(prompt: string) {
      if (!prompt.trim()) return;
      this.loading = true;
      this.error = null;
      this.lastPrompt = prompt;

      try {
        const data = await generateArchitecture(prompt, this.level, this.syntax);
        this.architecture = data;
        this.focusId = null;
        this.readmeStale = true;
        this.readme = "";
        this.fileStructure = [];
        this._rebuildGraph();

        // Add to history
        this.history.push({ prompt, timestamp: Date.now() });
        if (this.history.length > 20) this.history.shift();

        this._persist();
      } catch (e: any) {
        this.error = e.message || "Failed to generate";
      } finally {
        this.loading = false;
      }
    },

    async regenerate() {
      if (this.lastPrompt) await this.generate(this.lastPrompt);
    },

    // ── Navigation ───────────────────────────────────────────────
    focusNode(id: string) {
      if (!this.architecture) return;
      this.focusId = id;
      this._rebuildGraph();
      this._persist();
    },

    goBack() {
      if (!this.architecture) return;
      if (this.breadcrumbs.length > 1) {
        this.focusNode(this.breadcrumbs[this.breadcrumbs.length - 2].id);
      } else {
        this.focusId = null;
        this._rebuildGraph();
        this._persist();
      }
    },

    // ── Hybrid editing ───────────────────────────────────────────
    editNode(id: string, title: string, description: string) {
      if (!this.architecture) return;
      const arch = deepClone(this.architecture);
      const node = findInTree(arch, id);
      if (node) {
        node.title = title;
        node.description = description;
        this.architecture = arch;
        this.readmeStale = true;
        this._rebuildGraph();
        this._persist();
      }
    },

    deleteNode(id: string) {
      if (!this.architecture) return;
      if (this.architecture.id === id) {
        this.error = "Cannot delete root node";
        return;
      }
      const arch = deepClone(this.architecture);
      const parent = findParent(arch, id);
      if (parent) {
        parent.children = (parent.children || []).filter((c) => c.id !== id);
        this.architecture = arch;
        this.readmeStale = true;
        if (this.focusId === id) this.focusId = parent.id;
        this._rebuildGraph();
        this._persist();
      }
    },

    addChildNode(parentId: string) {
      if (!this.architecture) return;
      const arch = deepClone(this.architecture);
      const parent = findInTree(arch, parentId);
      if (parent) {
        const newNode: ArchNode = {
          id: "new-" + Math.random().toString(36).slice(2, 8),
          title: "New Node",
          description: "Click edit to describe",
          depth: parent.depth + 1,
          children: [],
          code: "",
        };
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        this.architecture = arch;
        this.readmeStale = true;
        this._rebuildGraph();
        this._persist();
      }
    },

    // ── README ───────────────────────────────────────────────────
    async refreshReadme() {
      if (!this.architecture) return;
      this.readmeLoading = true;
      try {
        this.readme = await generateReadme(this.architecture, this.lastPrompt);
        this.readmeStale = false;
        this._persist();
      } catch (e: any) {
        this.error = "Failed to generate README: " + e.message;
      } finally {
        this.readmeLoading = false;
      }
    },

    toggleReadme() {
      this.readmeVisible = !this.readmeVisible;
    },

    // ── File structure ───────────────────────────────────────────
    async loadFileStructure() {
      if (!this.architecture) return;
      try {
        this.fileStructure = await getFileStructure(this.architecture);
        this.fileStructureVisible = true;
        this._persist();
      } catch (e: any) {
        this.error = "Failed to generate file structure";
      }
    },

    toggleFileStructure() {
      this.fileStructureVisible = !this.fileStructureVisible;
    },

    // ── Upload ───────────────────────────────────────────────────
    async uploadCodebase(files: { path: string; content: string }[]) {
      this.uploadLoading = true;
      this.error = null;
      try {
        const data = await analyzeCodebase(files);
        this.architecture = data;
        this.focusId = null;
        this.lastPrompt = "[Uploaded Codebase]";
        this.readmeStale = true;
        this.readme = "";
        this.fileStructure = [];
        this._rebuildGraph();
        this._persist();
      } catch (e: any) {
        this.error = e.message || "Failed to analyze codebase";
      } finally {
        this.uploadLoading = false;
      }
    },

    // ── Code viewer ───────────────────────────────────────────────
    toggleCodeViewer() {
      this.codeViewerVisible = !this.codeViewerVisible;
    },

    // ── Node AI ──────────────────────────────────────────────────
    openNodeAI(nodeId: string) {
      this.activeAINodeId = nodeId;
    },

    closeNodeAI() {
      this.activeAINodeId = null;
    },

    updateNodeFromAI(updatedNode: any) {
      if (!this.architecture || !updatedNode?.id) return;
      const arch = deepClone(this.architecture);
      const node = findInTree(arch, updatedNode.id);
      if (node) {
        if (updatedNode.title) node.title = updatedNode.title;
        if (updatedNode.description) node.description = updatedNode.description;
        if (updatedNode.code !== undefined) node.code = updatedNode.code;
        this.architecture = arch;
        this.readmeStale = true;
        this._rebuildGraph();
        this._persist();
      }
    },

    // ── Reset ────────────────────────────────────────────────────
    reset() {
      this.level = 2;
      this.mode = "AI Decompose";
      this.syntax = "Hide Syntax";
      this.aiEnabled = true;
      this.focusId = null;
      this.error = null;
      this.architecture = null;
      this.nodes = [];
      this.edges = [];
      this.breadcrumbs = [];
      this.lastPrompt = "";
      this.readme = "";
      this.readmeStale = false;
      this.readmeVisible = false;
      this.fileStructure = [];
      this.fileStructureVisible = false;
      this._persist();
    },
  },
});
