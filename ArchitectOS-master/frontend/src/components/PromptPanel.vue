<template>
  <div class="absolute bottom-6 right-6 w-[380px] glass-card rounded-none p-4 z-40 select-none shadow-xl border border-borderMuted">
    <div class="flex gap-2">
      <input
        v-model="prompt"
        @keyup.enter="submit"
        placeholder="Describe system changes..."
        class="flex-1 bg-surface rounded-none px-3 py-2 text-xs border border-borderMuted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition duration-200 placeholder:text-textSecondary/40 text-textPrimary font-mono"
      />
      <button
        class="bg-accent text-white px-4 rounded-none text-xs font-semibold hover:bg-accent/90 shadow-none transition duration-200"
        @click="submit"
        :disabled="store.loading"
      >
        {{ store.loading ? "..." : "Go" }}
      </button>
    </div>
    <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-borderMuted">
      <p class="text-[10px] text-textSecondary font-medium">
        {{ levelName }} · {{ store.mode }} · {{ store.syntax }}
      </p>
      <span 
        class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none" 
        :class="store.aiEnabled ? 'bg-accentLight text-accent border border-accent/20' : 'bg-surfaceHover text-textSecondary border border-borderMuted'"
      >
        {{ store.aiEnabled ? "AI Mode" : "Mock Mode" }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAppStore } from "../store/app";

const store = useAppStore();
const prompt = ref(store.lastPrompt || "");

const levelName = computed(() => {
  const names: Record<number, string> = { 1: "Beginner", 2: "Intermediate", 3: "Advanced", 4: "Expert" };
  return names[store.level] || "Unknown";
});

const submit = () => {
  if (prompt.value.trim() && !store.loading) {
    store.generate(prompt.value);
  }
};
</script>
