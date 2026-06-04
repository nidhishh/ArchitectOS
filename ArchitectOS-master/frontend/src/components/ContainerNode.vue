<template>
  <Handle type="target" :position="Position.Left" style="visibility: hidden" />
  <div class="h-full w-full border-2 border-dashed border-borderMuted bg-surface/30 p-4 rounded-none flex flex-col select-none hover:border-accent/40 transition-colors duration-200">
    <!-- Header -->
    <div class="flex items-center gap-2 border-b border-borderMuted/60 pb-2 mb-3">
      <span class="text-accent flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/></svg>
      </span>
      <div class="font-bold text-xs uppercase tracking-widest text-accent truncate">
        {{ props.data.title }}
      </div>
    </div>
    <!-- Description -->
    <div class="text-[10px] text-textSecondary leading-normal font-mono mb-4">
      {{ props.data.description }}
    </div>
  </div>
  <Handle type="source" :position="Position.Right" style="visibility: hidden" />
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

const props = defineProps<{
  id: string;
  data: {
    title: string;
    description: string;
  };
}>();
</script>
