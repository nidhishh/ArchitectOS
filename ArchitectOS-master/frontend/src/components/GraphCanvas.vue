<template>
  <div class="h-full w-full grid-dots relative">
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      :node-types="nodeTypes"
      class="h-full w-full"
      :fit-view-on-init="true"
      :min-zoom="0.05"
      :max-zoom="3"
      :default-viewport="{ zoom: 0.8, x: 0, y: 0 }"
      @nodeClick="onNodeClick"
    >
      <Background :gap="24" :size="1" />
      <MiniMap
        :pannable="true"
        :zoomable="true"
        class="!bg-surface/80 !border-white/10 !rounded-xl"
      />
      <Controls class="!bg-surface/80 !border-white/10 !rounded-xl" />
    </VueFlow>

    <!-- Breadcrumbs -->
    <div v-if="breadcrumbs.length" class="absolute top-4 left-4 glass px-4 py-2 rounded-xl text-sm z-40 flex items-center gap-1">
      <button class="text-accent hover:text-white transition mr-2" @click="store.goBack()">← Back</button>
      <span
        v-for="(crumb, idx) in breadcrumbs"
        :key="crumb.id"
        class="cursor-pointer hover:text-accent transition"
        @click="store.focusNode(crumb.id)"
      >
        {{ crumb.title }}<span v-if="idx < breadcrumbs.length - 1" class="text-textSecondary mx-1">/</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { Controls } from "@vue-flow/controls";
import { useAppStore } from "../store/app";
import NodeCard from "./NodeCard.vue";

const store = useAppStore();

const flowNodes = computed(() => store.nodes);
const flowEdges = computed(() => store.edges);
const breadcrumbs = computed(() => store.breadcrumbs);
const nodeTypes = { card: NodeCard };

const onNodeClick = (event: any) => {
  const nodeId = event.node?.id;
  if (!nodeId || !store.architecture) return;
  const archNode = findInTree(store.architecture, nodeId);
  if (archNode && archNode.children && archNode.children.length > 0) {
    store.focusNode(nodeId);
  }
};

function findInTree(node: any, id: string): any {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findInTree(child, id);
    if (found) return found;
  }
  return null;
}
</script>
