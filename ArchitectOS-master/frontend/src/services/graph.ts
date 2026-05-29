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
        animated: true,
        style: { stroke: "#4F8CFF", strokeWidth: 2 },
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
