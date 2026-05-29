<template>
  <aside class="w-[280px] h-full p-5 glass flex flex-col gap-6 border-r border-white/5 overflow-y-auto">
    <div>
      <h2 class="text-xl font-semibold text-accent">ArchitectOS</h2>
      <p class="text-textSecondary text-xs mt-1">Local AI Architecture Visualizer</p>
    </div>

    <!-- Autonomy Slider -->
    <div>
      <label class="text-sm text-textSecondary block mb-2">Autonomy Level</label>
      <input
        type="range"
        min="1"
        max="4"
        v-model.number="store.level"
        class="w-full accent-accent"
      />
      <div class="flex justify-between text-[10px] text-textSecondary mt-1">
        <span :class="{ 'text-accent font-bold': store.level === 1 }">Beginner</span>
        <span :class="{ 'text-accent font-bold': store.level === 2 }">Intermediate</span>
        <span :class="{ 'text-accent font-bold': store.level === 3 }">Advanced</span>
        <span :class="{ 'text-accent font-bold': store.level === 4 }">Expert</span>
      </div>
      <button
        v-if="store.lastPrompt"
        class="mt-2 w-full text-xs bg-accent/20 text-accent py-1 rounded-lg hover:bg-accent/30 transition"
        @click="store.regenerate()"
      >
        Regenerate with level {{ store.level }}
      </button>
    </div>

    <!-- Mode -->
    <div>
      <label class="text-sm text-textSecondary block mb-2">Mode</label>
      <div class="flex flex-col gap-1">
        <button
          v-for="m in modes"
          :key="m.id"
          :class="[
            'text-xs px-3 py-2 rounded-lg text-left transition',
            m.disabled ? 'bg-surface/50 text-textSecondary/40 cursor-not-allowed' :
            store.mode === m.id ? 'bg-accent text-white' : 'bg-surface text-textSecondary hover:text-white'
          ]"
          @click="!m.disabled && (store.mode = m.id)"
          :disabled="m.disabled"
        >
          <div class="font-medium">{{ m.id }}</div>
          <div class="text-[9px] opacity-70 mt-0.5">{{ m.desc }}</div>
        </button>
      </div>
    </div>

    <!-- Syntax Toggle -->
    <div>
      <label class="text-sm text-textSecondary block mb-2">Syntax</label>
      <div class="flex flex-col gap-1">
        <button
          v-for="s in syntaxOptions"
          :key="s"
          :class="[
            'text-xs px-3 py-2 rounded-lg text-left transition',
            store.syntax === s ? 'bg-accent2 text-white' : 'bg-surface text-textSecondary hover:text-white'
          ]"
          @click="store.syntax = s; store.regenerate()"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <!-- AI Toggle -->
    <div class="flex items-center justify-between">
      <label class="text-sm text-textSecondary">AI Enabled</label>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="store.aiEnabled" class="sr-only peer" />
        <div class="w-9 h-5 bg-surface rounded-full peer peer-checked:bg-accent transition"></div>
        <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4"></div>
      </label>
    </div>

    <!-- Hybrid hint -->
    <div v-if="store.mode === 'Hybrid' && store.architecture" class="text-[10px] text-yellow-400/80 bg-yellow-400/10 rounded-lg p-2">
      ✏️ Edit, ➕ add, or 🗑️ delete nodes directly on the graph. Changes are instant.
    </div>

    <!-- Stats -->
    <div v-if="store.architecture" class="text-[10px] text-textSecondary bg-surface rounded-lg p-2 space-y-0.5">
      <div>📊 Nodes: {{ nodeCount }}</div>
      <div>🌳 Max depth: {{ maxDepth }}</div>
      <div>📝 Prompt: {{ store.lastPrompt.slice(0, 40) }}{{ store.lastPrompt.length > 40 ? '...' : '' }}</div>
    </div>

    <div class="flex-1"></div>

    <!-- Reset -->
    <button
      class="bg-surface text-textSecondary py-2 rounded-xl hover:text-white hover:bg-white/10 transition text-sm border border-white/5"
      @click="store.reset()"
    >
      Reset
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useAppStore } from "../store/app";
const store = useAppStore();

const modes = [
  { id: "AI Decompose" as const, desc: "AI generates the full architecture", disabled: false },
  { id: "Hybrid" as const, desc: "AI generates, you edit/add/delete nodes", disabled: false },
];
const syntaxOptions = ["Hide Syntax", "Show Pseudocode", "Show Real Code"] as const;

function countNodes(node: any): number {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((s: number, c: any) => s + countNodes(c), 0);
}
function getMaxDepth(node: any): number {
  if (!node) return 0;
  if (!node.children || node.children.length === 0) return node.depth || 1;
  return Math.max(...node.children.map(getMaxDepth));
}

import { computed } from "vue";
const nodeCount = computed(() => countNodes(store.architecture));
const maxDepth = computed(() => getMaxDepth(store.architecture));
</script>
