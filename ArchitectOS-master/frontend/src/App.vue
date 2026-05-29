<template>
  <div class="h-screen w-screen bg-bg text-textPrimary flex overflow-hidden">
    <!-- Always mounted so welcome-screen upload can open the file picker -->
    <input ref="fileInput" type="file" accept=".zip,.tar,.gz,.js,.ts,.py,.java,.go,.rs,.c,.cpp,.h,.jsx,.tsx,.vue,.svelte,.rb,.php,.cs,.swift,.kt" multiple class="hidden" @change="handleUpload" />
    <Sidebar />
    <div class="flex-1 relative flex flex-col">
      <!-- Toolbar -->
      <div v-if="store.architecture && !store.loading" class="flex items-center gap-2 p-3 border-b border-white/5 bg-bg z-30 flex-wrap">
        <button :class="readmeBtnClass" @click="onReadmeClick" :disabled="store.readmeLoading">
          {{ store.readmeLoading ? '⏳ Generating...' : readmeBtnLabel }}
        </button>
        <button class="toolbar-btn" @click="store.loadFileStructure()">📁 File Structure</button>
        <button class="toolbar-btn bg-accent/10 border-accent/30 text-accent hover:text-white" @click="store.toggleCodeViewer()">
          💻 Watch Code
        </button>
        <button class="toolbar-btn" @click="downloadZip">📦 Download ZIP</button>
        <button class="toolbar-btn" @click="triggerUpload">📤 Upload Codebase</button>

        <div class="flex-1"></div>
        <span class="text-[10px] text-textSecondary truncate max-w-[200px]">{{ store.lastPrompt }}</span>
      </div>

      <!-- Welcome screen -->
      <div v-if="!store.architecture && !store.loading && !store.uploadLoading" class="flex-1 flex flex-col items-center justify-center gap-6">
        <h1 class="text-4xl font-bold text-accent">ArchitectOS</h1>
        <p class="text-textSecondary text-lg max-w-md text-center">
          Describe any system and watch it decompose into an interactive architecture graph.
        </p>
        <div class="flex gap-2 w-[480px]">
          <input v-model="prompt" @keyup.enter="submit" placeholder="e.g. Build an API Gateway with authentication" class="flex-1 bg-surface rounded-xl p-3 text-sm border border-white/5 focus:border-accent outline-none transition" />
          <button class="bg-accent text-white px-6 rounded-xl font-medium hover:opacity-90 transition" @click="submit">Generate</button>
        </div>
        <div class="flex gap-2 mt-2 flex-wrap justify-center">
          <button v-for="example in examples" :key="example" class="text-xs bg-surface px-3 py-1.5 rounded-lg text-textSecondary hover:text-white transition cursor-pointer" @click="prompt = example; submit()">{{ example }}</button>
        </div>
        <div class="mt-4 text-textSecondary text-sm">or</div>
        <button class="bg-surface text-textSecondary px-4 py-2 rounded-xl text-sm hover:text-white transition border border-white/5" @click="triggerUpload">📤 Upload existing codebase to visualize</button>
        <div v-if="store.history.length" class="mt-6 w-[480px]">
          <p class="text-textSecondary text-xs mb-2">Recent:</p>
          <div class="flex flex-col gap-1">
            <button v-for="h in store.history.slice(-5).reverse()" :key="h.timestamp" class="text-xs text-left bg-surface px-3 py-2 rounded-lg text-textSecondary hover:text-white transition truncate" @click="prompt = h.prompt; submit()">{{ h.prompt }}</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading || store.uploadLoading" class="flex-1 flex flex-col items-center justify-center gap-4">
        <div class="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p class="text-textSecondary">{{ store.uploadLoading ? 'Analyzing codebase...' : 'Generating architecture...' }}</p>
      </div>

      <!-- Error -->
      <div v-if="store.error && !store.loading" class="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded-xl text-sm z-50 flex items-center gap-2">
        {{ store.error }}
        <button @click="store.error = null" class="text-white/60 hover:text-white">✕</button>
      </div>

      <!-- Graph -->
      <div v-if="store.architecture && !store.loading" class="flex-1 relative">
        <GraphCanvas />
        <PromptPanel />
      </div>

      <!-- Modals -->
      <ReadmeModal v-if="store.readmeVisible" />
      <FileStructureModal v-if="store.fileStructureVisible" />
      <CodeViewer v-if="store.codeViewerVisible" :architecture="store.architecture" @close="store.toggleCodeViewer()" />
      <NodeAIChat
        v-if="store.activeAINodeId && activeAINode"
        :node="activeAINode"
        @close="store.closeNodeAI()"
        @update="store.updateNodeFromAI($event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Sidebar from "./components/Sidebar.vue";
import GraphCanvas from "./components/GraphCanvas.vue";
import PromptPanel from "./components/PromptPanel.vue";
import ReadmeModal from "./components/ReadmeModal.vue";
import FileStructureModal from "./components/FileStructureModal.vue";
import CodeViewer from "./components/CodeViewer.vue";
import NodeAIChat from "./components/NodeAIChat.vue";
import { useAppStore } from "./store/app";

const store = useAppStore();
const prompt = ref(store.lastPrompt || "");
const fileInput = ref<HTMLInputElement | null>(null);

if (store.architecture) store._rebuildGraph();

const examples = [
  "Build an API Gateway",
  "Design a Blockchain",
  "ATM Machine in Java OOP",
  "Chat Application with WebSockets",
  "E-commerce Backend",
  "Compiler Design",
];

const readmeBtnLabel = computed(() => {
  if (!store.readme) return "📝 Generate README";
  if (store.readmeStale) return "🔴 Refresh README";
  return "📝 View README";
});

const readmeBtnClass = computed(() => {
  if (store.readmeStale && store.readme) return "toolbar-btn toolbar-btn-stale";
  return "toolbar-btn";
});

const activeAINode = computed(() => {
  if (!store.activeAINodeId || !store.architecture) return null;
  return findInTree(store.architecture, store.activeAINodeId);
});

function findInTree(node: any, id: string): any {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findInTree(child, id);
    if (found) return found;
  }
  return null;
}

const submit = () => { if (prompt.value.trim()) store.generate(prompt.value); };

const onReadmeClick = async () => {
  if (!store.readme || store.readmeStale) await store.refreshReadme();
  store.readmeVisible = true;
};

const triggerUpload = () => fileInput.value?.click();

const handleUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const files: { path: string; content: string }[] = [];
  const textExts = /\.(js|ts|jsx|tsx|vue|svelte|py|java|go|rs|c|cpp|h|hpp|rb|php|cs|swift|kt|json|yaml|yml|toml|md|txt|html|css|scss|sql|sh|bash|dockerfile|makefile|gradle|xml|env|gitignore|conf|cfg|ini)$/i;
  for (const file of Array.from(input.files)) {
    if (file.name.endsWith(".zip")) {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      for (const [path, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && textExts.test(path) && !path.includes("node_modules") && !path.includes(".git/")) {
          try { const content = await zipEntry.async("string"); if (content.length < 50000) files.push({ path, content }); } catch {}
        }
      }
    } else if (textExts.test(file.name)) {
      const content = await file.text();
      if (content.length < 50000) files.push({ path: file.name, content });
    }
  }
  input.value = "";
  if (files.length === 0) { store.error = "No readable source files found."; return; }
  const payload = files.slice(0, 20).map((f) => ({
    path: f.path,
    content: f.content.slice(0, 8000),
  }));
  await store.uploadCodebase(payload);
};

function generateCodeFiles(node: any, basePath = ""): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  const dirName = node.id.replace(/[^a-z0-9-_]/gi, "-");
  const currentPath = basePath ? `${basePath}/${dirName}` : `src/${dirName}`;
  if (node.code) {
    results.push({ path: `${currentPath}/index.ts`, content: `/**\n * ${node.title}\n * ${node.description}\n */\n\n${node.code}\n` });
  } else {
    results.push({ path: `${currentPath}/index.ts`, content: `/**\n * ${node.title}\n * ${node.description}\n *\n * TODO: Implement\n */\n\nexport default {};\n` });
  }
  for (const child of node.children || []) results.push(...generateCodeFiles(child, currentPath));
  return results;
}

const downloadZip = async () => {
  if (!store.architecture) return;
  if (!store.readme || store.readmeStale) await store.refreshReadme();
  const zip = new JSZip();
  const projectName = store.architecture.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  zip.file("README.md", store.readme || `# ${store.architecture.title}\n\n${store.architecture.description}`);
  zip.file("architecture.json", JSON.stringify(store.architecture, null, 2));
  const codeFiles = generateCodeFiles(store.architecture);
  for (const f of codeFiles) zip.file(f.path, f.content);
  zip.file("package.json", JSON.stringify({ name: projectName, version: "1.0.0", description: store.architecture.description, main: "src/index.ts", scripts: { build: "tsc", start: "node dist/index.js" }, devDependencies: { typescript: "^5.0.0" } }, null, 2));
  zip.file("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2020", module: "ESNext", outDir: "./dist", rootDir: "./src", strict: true }, include: ["src/**/*"] }, null, 2));
  zip.file(".gitignore", "node_modules/\ndist/\n.env\n");
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${projectName}.zip`);
};
</script>

<style>
.toolbar-btn { @apply text-xs bg-surface px-3 py-1.5 rounded-lg text-textSecondary hover:text-white transition border border-white/5; }
.toolbar-btn-stale { @apply border-red-500/50 text-red-400; }
</style>
