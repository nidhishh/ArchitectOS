<template>
  <div class="absolute bottom-6 right-6 w-[380px] glass rounded-xl p-3 z-40">
    <div class="flex gap-2">
      <input
        v-model="prompt"
        @keyup.enter="submit"
        placeholder="Describe a system..."
        class="flex-1 bg-surface rounded-xl p-2 text-sm border border-white/5 focus:border-accent outline-none transition"
      />
      <button
        class="bg-accent text-white px-4 rounded-xl text-sm font-medium hover:opacity-90 transition"
        @click="submit"
        :disabled="store.loading"
      >
        {{ store.loading ? "..." : "Go" }}
      </button>
    </div>
    <div class="flex items-center justify-between mt-1.5">
      <p class="text-[9px] text-textSecondary">
        Level: {{ levelName }} · {{ store.mode }} · {{ store.syntax }}
      </p>
      <p class="text-[9px] text-textSecondary">
        {{ store.aiEnabled ? "🟢 AI" : "⚪ Mock" }}
      </p>
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
