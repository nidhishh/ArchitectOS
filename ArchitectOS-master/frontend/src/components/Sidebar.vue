<template>
  <aside class="w-[300px] h-full p-5 bg-surface flex flex-col gap-6 border-r border-borderMuted overflow-y-auto z-40 select-none font-sans">
    <!-- Header -->
    <div class="bg-bg border border-borderMuted p-4 rounded-none flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold tracking-tight text-textPrimary flex items-center gap-1.5">
          <span>Architect</span><span class="text-accent">OS</span>
        </h2>
        <p class="text-textSecondary text-[10px] font-bold tracking-widest uppercase mt-0.5">LOCAL ENGINE</p>
      </div>
      <span class="bg-accentLight border border-accent/25 text-accent text-[9px] font-bold px-2 py-0.5 rounded-none">v1.2</span>
    </div>

    <!-- Autonomy Level -->
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <label class="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Depth / Autonomy</label>
        <span class="text-xs bg-bg border border-borderMuted px-2 py-0.5 rounded-none text-accent font-semibold">{{ levelName }}</span>
      </div>
      <div class="bg-surface border border-borderMuted p-3 rounded-none space-y-3">
        <input
          type="range"
          min="1"
          max="4"
          v-model.number="store.level"
          class="w-full h-1.5 bg-bg appearance-none cursor-pointer accent-accent"
        />
        <div class="flex justify-between text-[10px] text-textSecondary font-semibold">
          <span :class="{ 'text-accent font-bold': store.level === 1 }">L1</span>
          <span :class="{ 'text-accent font-bold': store.level === 2 }">L2</span>
          <span :class="{ 'text-accent font-bold': store.level === 3 }">L3</span>
          <span :class="{ 'text-accent font-bold': store.level === 4 }">L4</span>
        </div>
        
        <button
          v-if="store.lastPrompt"
          class="w-full text-xs font-bold bg-surfaceHover text-textPrimary hover:bg-bg border border-borderMuted py-2 rounded-none transition duration-150"
          @click="store.regenerate()"
        >
          Regenerate (Level {{ store.level }})
        </button>
      </div>
    </div>

    <!-- Mode Selector -->
    <div class="space-y-2">
      <label class="text-[10px] font-bold text-textSecondary uppercase tracking-widest block">Generation Mode</label>
      <div class="grid grid-cols-2 gap-1 bg-bg p-1 rounded-none border border-borderMuted">
        <button
          v-for="m in modes"
          :key="m.id"
          :class="[
            'text-xs py-1.5 px-1 rounded-none text-center font-bold transition duration-150',
            m.disabled ? 'opacity-40 cursor-not-allowed' :
            store.mode === m.id ? 'bg-surface text-accent border border-borderMuted shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
          ]"
          @click="!m.disabled && (store.mode = m.id)"
          :disabled="m.disabled"
        >
          {{ m.label }}
        </button>
      </div>
      <div v-if="store.mode === 'Hybrid' && store.architecture" class="text-[10px] text-textPrimary bg-[#451a03]/40 border border-[#f97316]/25 rounded-none p-3 leading-relaxed mt-2 font-mono">
        💡 <strong>Hybrid Mode:</strong> Edit, add, or delete nodes directly on the graph canvas. Changes are persistent.
      </div>
    </div>

    <!-- Syntax Selector -->
    <div class="space-y-2">
      <label class="text-[10px] font-bold text-textSecondary uppercase tracking-widest block">Code Representation</label>
      <div class="flex flex-col gap-1 bg-bg p-1 border border-borderMuted rounded-none">
        <button
          v-for="s in syntaxOptions"
          :key="s"
          :class="[
            'text-xs px-3 py-1.5 rounded-none text-left font-bold transition duration-150 flex items-center justify-between',
            store.syntax === s ? 'bg-surface text-accent border border-borderMuted' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
          ]"
          @click="store.syntax = s; store.regenerate()"
        >
          <span>{{ s }}</span>
          <span v-if="store.syntax === s" class="w-1.5 h-1.5 bg-accent"></span>
        </button>
      </div>
    </div>

    <!-- AI Toggle Switch -->
    <div class="bg-surface border border-borderMuted p-3.5 rounded-none flex items-center justify-between">
      <div>
        <label class="text-xs font-bold text-textPrimary">Artificial Intelligence</label>
        <p class="text-[10px] text-textSecondary mt-0.5">Toggle local Ollama LLM</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="store.aiEnabled" class="sr-only peer" />
        <div class="w-10 h-6 bg-bg border border-borderMuted peer peer-checked:bg-accent peer-checked:border-transparent transition duration-200"></div>
        <div class="absolute left-1 top-1 w-4 h-4 bg-white shadow-sm transition duration-200 peer-checked:translate-x-4"></div>
      </label>
    </div>

    <!-- Statistics Panel -->
    <div v-if="store.architecture" class="space-y-2">
      <label class="text-[10px] font-bold text-textSecondary uppercase tracking-widest block">Graph Stats</label>
      <div class="bg-surface border border-borderMuted rounded-none p-3.5 space-y-2.5 text-[11px] font-medium text-textSecondary">
        <div class="flex justify-between items-center">
          <span>Total Nodes</span>
          <span class="text-textPrimary font-bold">{{ nodeCount }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span>Hierarchy Depth</span>
          <span class="text-textPrimary font-bold">{{ maxDepth }}</span>
        </div>
        <div class="pt-2 border-t border-borderMuted flex flex-col gap-0.5 font-mono">
          <span class="text-[9px] uppercase tracking-wider font-bold opacity-60">Last Prompt:</span>
          <span class="text-textPrimary text-xs truncate mt-0.5 leading-snug">{{ store.lastPrompt }}</span>
        </div>
      </div>
    </div>

    <div class="flex-1"></div>

    <!-- Reset -->
    <button
      class="bg-surface text-textSecondary py-2.5 rounded-none hover:text-red-400 hover:bg-red-950/20 hover:border-red-500/25 border border-borderMuted transition duration-150 text-xs font-bold uppercase tracking-widest"
      @click="store.reset()"
    >
      Reset Engine
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "../store/app";
const store = useAppStore();

const modes = [
  { id: "AI Decompose" as const, label: "AI Decompose", disabled: false },
  { id: "Hybrid" as const, label: "Hybrid Edit", disabled: false },
];
const syntaxOptions = ["Hide Syntax", "Show Pseudocode", "Show Real Code"] as const;

const levelName = computed(() => {
  const names: Record<number, string> = {
    1: "Beginner (L1)",
    2: "Intermediate (L2)",
    3: "Advanced (L3)",
    4: "Expert (L4)",
  };
  return names[store.level] || "L2";
});

function countNodes(node: any): number {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((s: number, c: any) => s + countNodes(c), 0);
}
function getMaxDepth(node: any): number {
  if (!node) return 0;
  if (!node.children || node.children.length === 0) return node.depth || 1;
  return Math.max(...node.children.map(getMaxDepth));
}

const nodeCount = computed(() => countNodes(store.architecture));
const maxDepth = computed(() => getMaxDepth(store.architecture));
</script>
