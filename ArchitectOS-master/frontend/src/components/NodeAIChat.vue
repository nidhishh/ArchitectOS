<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-none" @click.self="$emit('close')">
    <div class="glass-modal rounded-none w-[480px] max-h-[70vh] flex flex-col overflow-hidden border border-borderMuted shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-borderMuted bg-surfaceHover">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 bg-accentLight text-accent rounded-none border border-accent/15">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM5 10a7 7 0 0 0 14 0M12 15v4M9 22h6M8 8h.01M16 8h.01"/></svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-textPrimary">AI Copilot · {{ node.title }}</h3>
            <p class="text-[10.5px] text-textSecondary mt-0.5 truncate max-w-[320px]">{{ node.description }}</p>
          </div>
        </div>
        <button class="text-textSecondary hover:text-textPrimary transition duration-150" @click="$emit('close')">✕</button>
      </div>

      <!-- Chat messages -->
      <div class="flex-1 overflow-y-auto bg-surface p-5 space-y-4 select-text leading-relaxed" ref="chatContainer">
        <div class="text-xs text-textSecondary bg-bg border border-borderMuted rounded-none p-3.5 leading-relaxed">
          Ask me anything about <strong class="text-textPrimary font-semibold">{{ node.title }}</strong>. I can explain its functionality, suggest logic changes, or help you debug the code signature.
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="[
            'text-xs rounded-none p-3.5 max-w-[85%] leading-relaxed border',
            msg.role === 'user' 
              ? 'bg-accentLight border-accent/25 text-textPrimary ml-auto shadow-none' 
              : 'bg-bg border-borderMuted text-textSecondary'
          ]"
        >
          <pre v-if="msg.role === 'assistant'" class="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed">{{ msg.content }}</pre>
          <span v-else class="text-[11.5px]">{{ msg.content }}</span>
        </div>

        <div v-if="loading" class="text-xs text-textSecondary flex items-center gap-2 px-1">
          <div class="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span class="font-medium tracking-wide animate-pulse">Copilot is thinking...</span>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4 border-t border-borderMuted bg-surfaceHover flex gap-2">
        <input
          v-model="input"
          @keyup.enter="send"
          placeholder="Ask a question or request a code change..."
          class="flex-1 bg-surface rounded-none px-3.5 py-2.5 text-xs border border-borderMuted focus:border-accent outline-none transition duration-200 placeholder:text-textSecondary/40 text-textPrimary"
          :disabled="loading"
        />
        <button
          class="bg-accent text-white px-5 rounded-none text-xs font-semibold hover:bg-accent/90 shadow-none transition duration-200"
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
