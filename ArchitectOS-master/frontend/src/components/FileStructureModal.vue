<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-none" @click.self="store.toggleFileStructure()">
    <div class="glass-modal rounded-none w-[480px] max-h-[70vh] flex flex-col overflow-hidden border border-borderMuted shadow-2xl">
      <div class="flex items-center justify-between p-5 border-b border-borderMuted bg-surfaceHover">
        <h3 class="text-base font-semibold text-textPrimary flex items-center gap-2">
          <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>File Structure</span>
        </h3>
        <button class="text-textSecondary hover:text-textPrimary transition-colors duration-200" @click="store.toggleFileStructure()">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex-1 select-none">
        <div v-if="store.fileStructure.length === 0" class="text-textSecondary text-sm text-center py-10 font-medium">
          No file structure generated yet.
        </div>
        <div v-else class="font-mono text-xs space-y-1">
          <div
            v-for="file in treeLines"
            :key="file.path"
            class="group flex items-center gap-2 py-1 px-1.5 rounded-none text-textSecondary hover:text-textPrimary hover:bg-surfaceHover cursor-pointer transition duration-150"
            :style="{ paddingLeft: file.indent * 16 + 8 + 'px' }"
          >
            <span :class="file.isDir ? 'text-accent' : 'text-textSecondary/60'">
              {{ file.isDir ? '📂' : '📄' }}
            </span>
            <span :class="file.isDir ? 'font-medium text-accent' : 'text-textSecondary group-hover:text-textPrimary'">
              {{ file.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "../store/app";

const store = useAppStore();

interface TreeLine {
  path: string;
  name: string;
  indent: number;
  isDir: boolean;
}

const treeLines = computed((): TreeLine[] => {
  const lines: TreeLine[] = [];
  const dirs = new Set<string>();

  // Collect all directories
  for (const file of store.fileStructure) {
    const parts = file.split("/");
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  // Build sorted list
  const allPaths = [...Array.from(dirs).map((d) => d + "/"), ...store.fileStructure].sort();
  const seen = new Set<string>();

  for (const p of allPaths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const isDir = p.endsWith("/");
    const clean = isDir ? p.slice(0, -1) : p;
    const parts = clean.split("/");
    lines.push({
      path: p,
      name: parts[parts.length - 1],
      indent: parts.length - 1,
      isDir,
    });
  }

  return lines;
});
</script>
