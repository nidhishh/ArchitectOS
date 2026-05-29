<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click.self="$emit('close')">
    <div class="glass rounded-2xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/5">
        <div>
          <h3 class="text-sm font-semibold text-white">🤖 AI · {{ node.title }}</h3>
          <p class="text-[10px] text-textSecondary mt-0.5">{{ node.description }}</p>
        </div>
        <button class="text-textSecondary hover:text-white transition text-lg" @click="$emit('close')">✕</button>
      </div>

      <!-- Chat messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="chatContainer">
        <div class="text-xs text-textSecondary bg-surface rounded-lg p-3">
          Ask me anything about <strong class="text-white">{{ node.title }}</strong>. I can explain it, suggest changes, or help you understand the architecture.
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="[
            'text-xs rounded-lg p-3 max-w-[90%]',
            msg.role === 'user' ? 'bg-accent/20 text-white ml-auto' : 'bg-surface text-textSecondary'
          ]"
        >
          <pre v-if="msg.role === 'assistant'" class="whitespace-pre-wrap font-sans">{{ msg.content }}</pre>
          <span v-else>{{ msg.content }}</span>
        </div>

        <div v-if="loading" class="text-xs text-textSecondary flex items-center gap-2">
          <div class="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          Thinking...
        </div>
      </div>

      <!-- Input -->
      <div class="p-3 border-t border-white/5 flex gap-2">
        <input
          v-model="input"
          @keyup.enter="send"
          placeholder="Ask about this node..."
          class="flex-1 bg-surface rounded-xl px-3 py-2 text-xs border border-white/5 focus:border-accent outline-none transition"
          :disabled="loading"
        />
        <button
          class="bg-accent text-white px-4 rounded-xl text-xs font-medium hover:opacity-90 transition"
          @click="send"
          :disabled="loading || !input.trim()"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";

const props = defineProps<{ node: { id: string; title: string; description: string; code?: string } }>();
const emit = defineEmits(["close", "update"]);

const input = ref("");
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ role: "user", content: text });
  input.value = "";
  loading.value = true;

  await nextTick();
  if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;

  try {
    const res = await fetch("/api/node-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node: props.node,
        message: text,
        history: messages.value.slice(-10),
      }),
    });

    if (!res.ok) throw new Error("Failed");

    const data = await res.json();
    messages.value.push({ role: "assistant", content: data.reply });

    // If AI suggests a change, emit update
    if (data.updatedNode) {
      emit("update", data.updatedNode);
    }
  } catch (e) {
    messages.value.push({ role: "assistant", content: "Sorry, I couldn't process that. Try again." });
  } finally {
    loading.value = false;
    await nextTick();
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}
</script>
