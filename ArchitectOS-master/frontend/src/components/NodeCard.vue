<template>
  <Handle type="target" :position="Position.Left" style="visibility: hidden" />
  <div
    class="border-2 p-3 min-w-[210px] max-w-[280px] shadow-sm font-sans text-left transition-all duration-150 rounded-none"
    :class="[categoryColorClass.border, categoryColorClass.bg, isEditing ? 'ring-2 ring-[#ff9900]' : '']"
  >
    <template v-if="!isEditing">
      <!-- Title & Icon Header -->
      <div class="flex items-center gap-1.5 border-b pb-1.5 mb-1.5 border-black/5">
        <!-- Small Icon -->
        <span :class="categoryColorClass.text" class="flex-shrink-0">
          <svg v-if="categoryColorClass.icon === 'cloud'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 0 0 4 4h9a5 5 0 1 0-.1-9.999 5.002 5.002 0 1 0-9.78 2.096A4.001 4.001 0 0 0 3 15z"/></svg>
          <svg v-else-if="categoryColorClass.icon === 'shield'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          <svg v-else-if="categoryColorClass.icon === 'cpu'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2zM9 9h6v6H9V9z"/></svg>
          <svg v-else-if="categoryColorClass.icon === 'sparkles'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
        </span>
        <div class="font-bold text-xs uppercase tracking-wider truncate flex-1" :class="categoryColorClass.text">
          {{ props.data.title }}
        </div>
      </div>
      
      <!-- Description -->
      <div class="text-[11px] text-textPrimary leading-relaxed mb-2 font-mono line-clamp-3">
        {{ props.data.description }}
      </div>

      <!-- Code Preview -->
      <div v-if="props.data.code" class="bg-bg border border-borderMuted p-1.5 overflow-x-auto max-h-[85px] scrollbar-thin rounded-none mb-2">
        <pre class="text-[10px] text-textSecondary font-mono leading-tight whitespace-pre-wrap">{{ props.data.code }}</pre>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-2 border-t border-black/5 mt-auto">
        <div v-if="hasChildren" class="text-[10px] font-bold flex items-center gap-1 cursor-pointer" :class="categoryColorClass.text" @click.stop="drillIn">
          <span>Explore Zone</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
        <div v-else class="text-[9px] text-textSecondary font-mono uppercase tracking-widest">Leaf</div>
        
        <div class="flex items-center gap-1">
          <!-- Ask AI -->
          <button 
            class="p-1 text-textSecondary hover:text-accent hover:bg-white/5 transition duration-150" 
            @click.stop="openAI" 
            title="Ask AI"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM5 10a7 7 0 0 0 14 0M12 15v4M9 22h6M8 8h.01M16 8h.01"/></svg>
          </button>
          
          <template v-if="isHybrid">
            <!-- Edit -->
            <button 
              class="p-1 text-textSecondary hover:text-[#ff9900] hover:bg-white/5 transition duration-150" 
              @click.stop="startEdit" 
              title="Edit Node"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <!-- Delete -->
            <button 
              class="p-1 text-textSecondary hover:text-red-600 hover:bg-white/5 transition duration-150" 
              @click.stop="deleteNode" 
              title="Delete Node"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
            </button>
            <!-- Add Child -->
            <button 
              class="p-1 text-textSecondary hover:text-[#34a853] hover:bg-white/5 transition duration-150" 
              @click.stop="addChild" 
              title="Add Component"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </template>
        </div>
      </div>
    </template>

    <template v-else>
      <input 
        v-model="editTitle" 
        class="w-full bg-surface rounded-none px-2 py-1.5 text-xs text-textPrimary outline-none border border-borderMuted mb-2 font-mono" 
        placeholder="Component Name" 
        @keyup.enter="saveEdit" 
      />
      <textarea 
        v-model="editDesc" 
        class="w-full bg-surface rounded-none px-2 py-1.5 text-[11px] text-textPrimary outline-none border border-borderMuted resize-none mb-2 font-mono" 
        rows="2.5" 
        placeholder="Component description..."
      ></textarea>
      <div class="flex gap-2 justify-end">
        <button class="text-[10px] bg-[#34a853] hover:bg-[#34a853]/90 text-white px-3 py-1 rounded-none font-bold" @click.stop="saveEdit">Save</button>
        <button class="text-[10px] bg-surface border border-borderMuted text-textSecondary hover:text-textPrimary px-3 py-1 rounded-none" @click.stop="cancelEdit">Cancel</button>
      </div>
    </template>
  </div>
  <Handle type="source" :position="Position.Right" style="visibility: hidden" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { useAppStore } from "../store/app";

const props = defineProps<{ id: string; data: { title: string; description: string; code?: string } }>();
const store = useAppStore();

const isEditing = ref(false);
const editTitle = ref("");
const editDesc = ref("");

const isHybrid = computed(() => store.mode === "Hybrid");
const hasChildren = computed(() => {
  if (!store.architecture) return false;
  const node = findInTree(store.architecture, props.id);
  return node ? (node.children || []).length > 0 : false;
});

const categoryColorClass = computed(() => {
  const title = props.data.title.toLowerCase();
  
  if (title.includes("api") || title.includes("gateway") || title.includes("route") || title.includes("controller") || title.includes("external") || title.includes("web") || title.includes("http") || title.includes("client") || title.includes("imports") || title.includes("exports")) {
    return {
      border: "border-[#3b82f6]", // Blue
      bg: "bg-[#172554]/60",
      text: "text-[#93c5fd]",
      icon: "cloud"
    };
  }
  if (title.includes("auth") || title.includes("security") || title.includes("user") || title.includes("core") || title.includes("system") || title.includes("main") || title.includes("class")) {
    return {
      border: "border-[#10b981]", // Green
      bg: "bg-[#064e3b]/60",
      text: "text-[#34d399]",
      icon: "shield"
    };
  }
  if (title.includes("worker") || title.includes("queue") || title.includes("process") || title.includes("job") || title.includes("parser") || title.includes("extractor") || title.includes("service") || title.includes("function") || title.includes("handler") || title.includes("calls")) {
    return {
      border: "border-[#f97316]", // Orange
      bg: "bg-[#451a03]/60",
      text: "text-[#fdba74]",
      icon: "cpu"
    };
  }
  if (title.includes("llm") || title.includes("ai") || title.includes("ollama") || title.includes("model") || title.includes("gpt") || title.includes("claude") || title.includes("chat")) {
    return {
      border: "border-[#8b5cf6]", // Purple
      bg: "bg-[#2e1065]/60",
      text: "text-[#c084fc]",
      icon: "sparkles"
    };
  }
  // Default/Infrastructure (Gray)
  return {
    border: "border-[#9ca3af]", 
    bg: "bg-[#1f2937]/60",
    text: "text-[#d1d5db]",
    icon: "database"
  };
});

function startEdit() { editTitle.value = props.data.title; editDesc.value = props.data.description; isEditing.value = true; }
function cancelEdit() { isEditing.value = false; }
function saveEdit() { store.editNode(props.id, editTitle.value, editDesc.value); isEditing.value = false; }
function deleteNode() { store.deleteNode(props.id); }
function addChild() { store.addChildNode(props.id); }
function drillIn() { store.focusNode(props.id); }
function openAI() { store.openNodeAI(props.id); }

function findInTree(node: any, id: string): any {
  if (node.id === id) return node;
  for (const child of node.children || []) { const found = findInTree(child, id); if (found) return found; }
  return null;
}
</script>
