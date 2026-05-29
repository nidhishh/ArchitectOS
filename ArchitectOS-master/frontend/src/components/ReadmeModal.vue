<template>
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" @click.self="store.toggleReadme()">
    <div class="glass rounded-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b border-white/5">
        <h3 class="text-lg font-semibold text-white">📝 README.md</h3>
        <div class="flex items-center gap-2">
          <button
            v-if="store.readmeStale"
            class="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/30 transition"
            @click="store.refreshReadme()"
            :disabled="store.readmeLoading"
          >
            {{ store.readmeLoading ? '⏳...' : '🔄 Refresh' }}
          </button>
          <button
            class="text-xs bg-surface text-textSecondary px-3 py-1 rounded-lg hover:text-white transition"
            @click="copyReadme"
          >
            {{ copied ? '✅ Copied' : '📋 Copy' }}
          </button>
          <button class="text-textSecondary hover:text-white transition text-lg" @click="store.toggleReadme()">✕</button>
        </div>
      </div>
      <div class="p-6 overflow-y-auto flex-1 readme-content" v-html="renderedReadme"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAppStore } from "../store/app";

const store = useAppStore();
const copied = ref(false);

// Simple markdown to HTML (covers basics)
const renderedReadme = computed(() => {
  let md = store.readme || "*No README generated yet.*";
  // Code blocks
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-green-400 text-xs font-mono">$2</code></pre>');
  // Inline code
  md = md.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-accent text-xs">$1</code>');
  // Headers
  md = md.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-white mt-4 mb-1">$1</h4>');
  md = md.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-4 mb-2">$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-accent mt-5 mb-2">$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-accent mt-4 mb-3">$1</h1>');
  // Bold
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
  // Italic
  md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Lists
  md = md.replace(/^- (.+)$/gm, '<li class="text-textSecondary text-sm ml-4 list-disc">$1</li>');
  md = md.replace(/^\d+\. (.+)$/gm, '<li class="text-textSecondary text-sm ml-4 list-decimal">$1</li>');
  // Paragraphs
  md = md.replace(/\n\n/g, '</p><p class="text-textSecondary text-sm my-2">');
  md = '<p class="text-textSecondary text-sm my-2">' + md + '</p>';
  return md;
});

const copyReadme = async () => {
  await navigator.clipboard.writeText(store.readme);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};
</script>
