<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-none" @click.self="store.toggleReadme()">
    <div class="glass-modal rounded-none w-[720px] max-h-[80vh] flex flex-col overflow-hidden border border-borderMuted shadow-2xl">
      <div class="flex items-center justify-between p-5 border-b border-borderMuted bg-surfaceHover">
        <h3 class="text-base font-semibold text-textPrimary flex items-center gap-2">
          <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>README.md</span>
        </h3>
        <div class="flex items-center gap-2.5">
          <button
            v-if="store.readmeStale"
            class="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-none transition duration-150 font-medium"
            @click="store.refreshReadme()"
            :disabled="store.readmeLoading"
          >
            {{ store.readmeLoading ? 'Syncing...' : 'Refresh README' }}
          </button>
          <button
            class="text-xs bg-surface border border-borderMuted hover:bg-surfaceHover text-textSecondary hover:text-textPrimary px-3 py-1.5 rounded-none transition-all duration-150 flex items-center gap-1.5 font-medium"
            @click="copyReadme"
          >
            <svg v-if="!copied" class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            <svg v-else class="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span>{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
          <button class="text-textSecondary hover:text-textPrimary transition duration-150 text-xl pl-2" @click="store.toggleReadme()">✕</button>
        </div>
      </div>
      <div class="p-8 overflow-y-auto flex-1 bg-surface readme-content select-text leading-relaxed" v-html="renderedReadme"></div>
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
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-bg border border-borderMuted rounded-none p-3.5 my-2.5 overflow-x-auto"><code class="text-textPrimary text-xs font-mono">$2</code></pre>');
  // Inline code
  md = md.replace(/`([^`]+)`/g, '<code class="bg-bg border border-borderMuted px-1.5 py-0.5 rounded-none text-accent text-xs font-mono font-semibold">$1</code>');
  // Headers
  md = md.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-textPrimary mt-4 mb-1">$1</h4>');
  md = md.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-textPrimary mt-4 mb-2">$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-accent mt-5 mb-2">$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-accent mt-4 mb-3">$1</h1>');
  // Bold
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong class="text-textPrimary font-semibold">$1</strong>');
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
