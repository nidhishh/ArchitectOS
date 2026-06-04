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
      :default_viewport="{ zoom: 0.8, x: 0, y: 0 }"
      @nodeClick="onNodeClick"
    >
      <Background :gap="24" :size="1" />
      <MiniMap
        :pannable="true"
        :zoomable="true"
        class="!bg-surface/85 !border-borderMuted !rounded-none"
      />
      <Controls class="!bg-surface/85 !border-borderMuted !rounded-none" />
    </VueFlow>

    <!-- Breadcrumbs -->
    <div v-if="breadcrumbs.length" class="absolute top-4 left-4 glass-card px-4 py-2.5 rounded-none text-xs font-semibold z-40 flex items-center gap-1 shadow-md">
      <button class="text-accent hover:text-accent/80 flex items-center gap-1 transition mr-3 border-r border-borderMuted pr-3" @click="store.goBack()">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        <span>Back</span>
      </button>
      <span
        v-for="(crumb, idx) in breadcrumbs"
        :key="crumb.id"
        class="cursor-pointer hover:text-accent transition duration-150"
        @click="store.focusNode(crumb.id)"
      >
        {{ crumb.title }}<span v-if="idx < breadcrumbs.length - 1" class="text-textSecondary/40 mx-2">/</span>
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
import ContainerNode from "./ContainerNode.vue";

const store = useAppStore();

const flowNodes = computed(() => store.nodes);
const flowEdges = computed(() => store.edges);
const breadcrumbs = computed(() => store.breadcrumbs);
const nodeTypes = { card: NodeCard, container: ContainerNode };

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
