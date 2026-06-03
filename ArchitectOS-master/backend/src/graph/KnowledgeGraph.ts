export interface GraphNode {
  id: string;
  name: string;
  type: "file" | "class" | "function" | "module" | "layer";
  properties: Record<string, any>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "imports" | "extends" | "calls" | "defines" | "exports";
  properties?: Record<string, any>;
}

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  constructor() {}

  addNode(id: string, name: string, type: GraphNode["type"], properties: Record<string, any> = {}): void {
    this.nodes.set(id, { id, name, type, properties });
  }

  addEdge(from: string, to: string, type: GraphEdge["type"], properties?: Record<string, any>): void {
    // Avoid duplicate edges
    const exists = this.edges.some(
      (e) => e.from === from && e.to === to && e.type === type
    );
    if (!exists) {
      this.edges.push({ from, to, type, properties });
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }

  serialize(): string {
    return JSON.stringify({
      nodes: this.getNodes(),
      edges: this.getEdges(),
    }, null, 2);
  }

  deserialize(json: string): void {
    this.clear();
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data.nodes)) {
        for (const n of data.nodes) {
          this.addNode(n.id, n.name, n.type, n.properties);
        }
      }
      if (Array.isArray(data.edges)) {
        for (const e of data.edges) {
          this.addEdge(e.from, e.to, e.type, e.properties);
        }
      }
    } catch (err) {
      console.error("Failed to deserialize KnowledgeGraph:", err);
    }
  }
}
