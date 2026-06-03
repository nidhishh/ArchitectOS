import type { Node, Edge } from "@vue-flow/core";

export type ArchNode = {
  id: string;
  title: string;
  description: string;
  depth: number;
  children: ArchNode[];
  code?: string;
};

function sanitize(node: any): ArchNode {
  return {
    id: node?.id || "unknown-" + Math.random().toString(36).slice(2, 8),
    title: node?.title || "Untitled",
    description: node?.description || "",
    depth: node?.depth || 1,
    code: node?.code || "",
    children: Array.isArray(node?.children) ? node.children.map(sanitize) : [],
  };
}

/**
 * Count total leaf nodes in subtree (for width calculation)
 */
function countLeaves(node: ArchNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/**
 * Build Vue Flow nodes/edges with tree-aware spacing
 */
export function buildGraph(root: any, focusId?: string) {
  const safe = sanitize(root);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const focusPath: ArchNode[] = [];

  let renderRoot: ArchNode = safe;

  if (focusId) {
    findPath(safe, focusId, focusPath);
    const found = findNode(safe, focusId);
    if (found) renderRoot = found;
  }

  layoutTree(renderRoot, nodes, edges);

  return { nodes, edges, focusPath };
}

function findNode(node: ArchNode, targetId: string): ArchNode | null {
  if (node.id === targetId) return node;
  for (const child of node.children || []) {
    const found = findNode(child, targetId);
    if (found) return found;
  }
  return null;
}

function findPath(node: ArchNode, targetId: string, path: ArchNode[]): boolean {
  path.push(node);
  if (node.id === targetId) return true;
  for (const child of node.children || []) {
    if (findPath(child, targetId, path)) return true;
  }
  path.pop();
  return false;
}

/**
 * Tree layout: uses leaf count to allocate horizontal space proportionally.
 * This prevents overlap even for unbalanced trees.
 */
function layoutTree(root: ArchNode, nodes: Node[], edges: Edge[]) {
  const NODE_WIDTH = 240;
  const H_GAP = 40;
  const V_GAP = 200;

  const totalLeaves = countLeaves(root);
  const totalWidth = totalLeaves * (NODE_WIDTH + H_GAP);

  function place(node: ArchNode, x: number, width: number, y: number, parentId?: string) {
    const cx = x + width / 2 - NODE_WIDTH / 2;

    nodes.push({
      id: node.id,
      position: { x: cx, y },
      type: "card",
      data: { title: node.title, description: node.description, code: node.code || "" },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        type: "step",
        animated: true,
        style: { stroke: "#757575", strokeWidth: 2 },
      });
    }

    const children = node.children || [];
    if (children.length === 0) return;

    const childLeaves = children.map(countLeaves);
    const totalChildLeaves = childLeaves.reduce((a, b) => a + b, 0);

    let offsetX = x;
    children.forEach((child, i) => {
      const childWidth = (childLeaves[i] / totalChildLeaves) * width;
      place(child, offsetX, childWidth, y + V_GAP, node.id);
      offsetX += childWidth;
    });
  }

  place(root, 0, totalWidth, 0);
}

export function buildDependencyGraph(rawNodes: any[], rawEdges: any[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const fileNodes = rawNodes.filter((n) => n.type === "file");
  const classNodes = rawNodes.filter((n) => n.type === "class");
  const functionNodes = rawNodes.filter((n) => n.type === "function");

  const colWidth = 360;
  const rowHeight = 130;

  // Helper for path basename
  const pathBasename = (p: string): string => {
    const parts = p.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1];
  };

  // Position Files
  fileNodes.forEach((node, idx) => {
    nodes.push({
      id: node.id,
      position: { x: 50, y: idx * rowHeight },
      type: "card",
      data: {
        title: node.name,
        description: `File: ${node.id}`,
        code: "",
      },
    });
  });

  // Position Classes
  classNodes.forEach((node, idx) => {
    nodes.push({
      id: node.id,
      position: { x: 50 + colWidth, y: idx * rowHeight },
      type: "card",
      data: {
        title: node.name,
        description: `Class defined in ${pathBasename(node.properties?.filePath || "")}`,
        code: node.properties?.methods?.join("\n") || "",
      },
    });
  });

  // Position Functions
  functionNodes.forEach((node, idx) => {
    nodes.push({
      id: node.id,
      position: { x: 50 + colWidth * 2, y: idx * rowHeight },
      type: "card",
      data: {
        title: node.name,
        description: `Function defined in ${pathBasename(node.properties?.filePath || "")}`,
        code: node.properties?.params?.length
          ? `Parameters: ${node.properties.params.join(", ")}`
          : "No parameters",
      },
    });
  });

  // Map edges
  rawEdges.forEach((edge, idx) => {
    let color = "#1a73e8"; // Blue for imports/extends
    if (edge.type === "calls") color = "#ec4899"; // Pink for calls
    if (edge.type === "defines") color = "#10b981"; // Green for definitions
    if (edge.type === "exports") color = "#8b5cf6"; // Purple for exports

    edges.push({
      id: `edge-${idx}`,
      source: edge.from,
      target: edge.to,
      type: "step",
      animated: edge.type === "calls",
      label: edge.type,
      style: { stroke: color, strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
}
