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

  if (!focusId) {
    layoutProjectOverview(safe, nodes, edges);
  } else {
    layoutDrillDown(renderRoot, nodes, edges);
  }

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
 * Project Overview layout: places Root on the left and subsystems in horizontal container columns.
 */
function layoutProjectOverview(root: ArchNode, nodes: Node[], edges: Edge[]) {
  const subsystems = root.children || [];
  const CARD_GAP = 20;
  const HEADER_HEIGHT = 80;
  const CONTAINER_WIDTH = 280;
  const CARD_WIDTH = 240;
  const CARD_X_OFFSET = 20;
  const CONTAINER_GAP = 125;

  let maxContainerHeight = 160;
  const containerHeights = subsystems.map((subsystem) => {
    let currentY = HEADER_HEIGHT;
    (subsystem.children || []).forEach((file) => {
      const cardHeight = file.code ? 180 : 115;
      currentY += cardHeight + CARD_GAP;
    });
    const height = Math.max(160, currentY + 10);
    if (height > maxContainerHeight) maxContainerHeight = height;
    return height;
  });

  const centerY = maxContainerHeight / 2 + 50;

  // Place Project Node
  nodes.push({
    id: root.id,
    position: { x: 50, y: centerY - 60 },
    type: "card",
    data: { title: root.title, description: root.description, code: root.code || "" },
    style: { width: "240px" }
  });

  // Place Subsystems and Files
  let currentX = 380;
  subsystems.forEach((subsystem, idx) => {
    const containerHeight = containerHeights[idx];
    const subsystemY = centerY - containerHeight / 2;

    nodes.push({
      id: subsystem.id,
      position: { x: currentX, y: subsystemY },
      type: "container",
      data: { title: subsystem.title, description: subsystem.description },
      style: { width: `${CONTAINER_WIDTH}px`, height: `${containerHeight}px` }
    });

    edges.push({
      id: `${root.id}->${subsystem.id}`,
      source: root.id,
      target: subsystem.id,
      type: "step",
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    });

    if (idx > 0) {
      edges.push({
        id: `flow-${subsystems[idx - 1].id}->${subsystem.id}`,
        source: subsystems[idx - 1].id,
        target: subsystem.id,
        type: "step",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 3 },
      });
    }

    let currentY = HEADER_HEIGHT;
    (subsystem.children || []).forEach((file) => {
      const cardHeight = file.code ? 180 : 115;
      nodes.push({
        id: file.id,
        parentNode: subsystem.id,
        position: { x: CARD_X_OFFSET, y: currentY },
        type: "card",
        data: { title: file.title, description: file.description, code: file.code || "" },
        style: { width: `${CARD_WIDTH}px` }
      });
      currentY += cardHeight + CARD_GAP;
    });

    currentX += CONTAINER_WIDTH + CONTAINER_GAP;
  });
}

/**
 * Focused Subtree layout: places root on left and children in horizontal tree.
 */
function layoutDrillDown(root: ArchNode, nodes: Node[], edges: Edge[]) {
  const NODE_WIDTH = 240;
  const H_GAP = 180;
  const V_GAP = 30;

  const totalLeaves = countLeaves(root);
  const totalHeight = totalLeaves * 150;

  function place(node: ArchNode, y: number, height: number, x: number, parentId?: string) {
    const cardHeight = node.code ? 180 : 115;
    const cy = y + height / 2 - cardHeight / 2;

    nodes.push({
      id: node.id,
      position: { x, y: cy },
      type: "card",
      data: { title: node.title, description: node.description, code: node.code || "" },
      style: { width: `${NODE_WIDTH}px` }
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

    let offsetY = y;
    children.forEach((child, i) => {
      const childHeight = (childLeaves[i] / totalChildLeaves) * height;
      place(child, offsetY, childHeight, x + NODE_WIDTH + H_GAP, node.id);
      offsetY += childHeight;
    });
  }

  place(root, 50, totalHeight, 50);
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
