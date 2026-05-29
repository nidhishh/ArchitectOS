<template>
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" @click.self="store.toggleFileStructure()">
    <div class="glass rounded-2xl w-[500px] max-h-[70vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b border-white/5">
        <h3 class="text-lg font-semibold text-white">📁 File Structure</h3>
        <button class="text-textSecondary hover:text-white transition text-lg" @click="store.toggleFileStructure()">✕</button>
      </div>
      <div class="p-4 overflow-y-auto flex-1">
        <div v-if="store.fileStructure.length === 0" class="text-textSecondary text-sm text-center py-8">
          No file structure generated yet.
        </div>
        <div v-else class="font-mono text-xs space-y-0.5">
          <div
            v-for="file in treeLines"
            :key="file.path"
            class="text-textSecondary hover:text-white transition"
            :style="{ paddingLeft: file.indent * 16 + 'px' }"
          >
            <span :class="file.isDir ? 'text-accent' : 'text-textSecondary'">
              {{ file.isDir ? '📂' : '📄' }} {{ file.name }}
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
