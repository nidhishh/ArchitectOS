<template>
  <div class="h-screen w-screen bg-bg text-textPrimary flex overflow-hidden">
    <!-- Always mounted so welcome-screen upload can open the file picker -->
    <input ref="fileInput" type="file" accept=".zip,.tar,.gz,.js,.ts,.py,.java,.go,.rs,.c,.cpp,.h,.jsx,.tsx,.vue,.svelte,.rb,.php,.cs,.swift,.kt" multiple class="hidden" @change="handleUpload" />
    <Sidebar />
    <div class="flex-1 relative flex flex-col">
      <!-- Toolbar -->
      <div v-if="store.architecture && !store.loading" class="flex items-center gap-3 p-3.5 border-b border-borderMuted bg-surface z-30 flex-wrap">
        <button :class="readmeBtnClass" @click="onReadmeClick" :disabled="store.readmeLoading">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>{{ store.readmeLoading ? 'Generating...' : readmeBtnLabel }}</span>
        </button>
        <button class="toolbar-btn" @click="store.loadFileStructure()">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>File Structure</span>
        </button>
        <button class="toolbar-btn" @click="store.toggleViewMode()">
          <svg class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <span>{{ store.viewMode === 'architecture' ? 'Show Code Dependency' : 'Show Logical Architecture' }}</span>
        </button>
        <button class="toolbar-btn bg-accentLight border border-accent/20 text-accent hover:bg-accentLight/60" @click="store.toggleCodeViewer()">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span>Watch Code</span>
        </button>
        <button class="toolbar-btn" :class="{ 'bg-accentLight/30 text-accent border-accent/25': store.promptPanelVisible }" @click="store.togglePromptPanel()">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Prompt Panel</span>
        </button>
        <button class="toolbar-btn" @click="downloadZip">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Download ZIP</span>
        </button>
        <button v-if="inVsCode" class="toolbar-btn bg-accentLight/30 border border-accent/25 text-accent hover:bg-accentLight/60" @click="decomposeActiveWorkspace">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>Analyze Workspace</span>
        </button>
        <button class="toolbar-btn" @click="triggerUpload">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload Codebase</span>
        </button>

        <div class="flex-1"></div>
        <span class="text-[11px] font-mono font-bold text-textSecondary bg-bg border border-borderMuted rounded-none px-2.5 py-1 truncate max-w-[240px]">{{ store.lastPrompt }}</span>
      </div>

      <!-- Welcome screen -->
      <div v-if="!store.architecture && !store.loading && !store.uploadLoading" class="flex-1 flex flex-col items-center justify-center gap-6 grid-dots relative overflow-hidden p-6 select-none">
        <div class="flex flex-col items-center max-w-xl text-center z-10 space-y-3">
          <h1 class="text-4xl font-extrabold tracking-tight text-textPrimary uppercase tracking-widest border-b-2 border-accent pb-2">ArchitectOS</h1>
          <p class="text-textSecondary text-sm max-w-md leading-relaxed font-mono">
            Decompose any backend, compiler, database or app idea into a fully-customizable interactive architecture graph.
          </p>
        </div>

        <div class="w-full max-w-[500px] bg-surface border border-borderMuted p-1.5 rounded-none flex gap-2 z-10 focus-within:border-accent shadow-sm transition duration-150">
          <input v-model="prompt" @keyup.enter="submit" placeholder="e.g., Design a high-throughput API gateway with Redis rate limiting" class="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-textSecondary/40 font-mono" />
          <button class="bg-accent hover:bg-accent/90 text-white px-5 rounded-none font-bold text-xs transition duration-150 active:scale-[0.98]" @click="submit">Generate</button>
        </div>

        <div class="flex gap-2 max-w-lg mt-1 flex-wrap justify-center z-10">
          <button v-for="example in examples" :key="example" class="text-xs bg-surface border border-borderMuted px-3 py-1.5 rounded-none text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition duration-150 cursor-pointer font-bold" @click="prompt = example; submit()">{{ example }}</button>
        </div>

        <div class="text-textSecondary/50 text-[10px] font-bold uppercase tracking-widest z-10 my-1">OR</div>

        <button v-if="inVsCode" class="bg-accentLight/30 border border-accent/25 hover:bg-accentLight/60 text-accent px-5 py-2.5 rounded-none text-xs font-bold tracking-wider uppercase transition duration-150 flex items-center gap-2 shadow-sm z-10 mb-2" @click="decomposeActiveWorkspace">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>Decompose Active Workspace</span>
        </button>

        <button class="bg-surface hover:bg-surfaceHover border border-borderMuted text-textSecondary hover:text-textPrimary px-5 py-2.5 rounded-none text-xs font-bold tracking-wider uppercase transition duration-150 flex items-center gap-2 shadow-sm z-10" @click="triggerUpload">
          <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Upload Codebase</span>
        </button>

        <div v-if="store.history.length" class="mt-4 w-[480px] z-10">
          <p class="text-textSecondary/55 text-[9px] font-bold uppercase tracking-wider mb-2 font-mono">Recent Generations</p>
          <div class="flex flex-col gap-1">
            <button v-for="h in store.history.slice(-3).reverse()" :key="h.timestamp" class="text-xs text-left bg-surface border border-borderMuted px-4 py-2 rounded-none text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition truncate font-mono" @click="prompt = h.prompt; submit()">{{ h.prompt }}</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading || store.uploadLoading" class="flex-1 flex flex-col items-center justify-center gap-5 grid-dots">
        <div class="w-12 h-12 border-[3.5px] border-accent border-t-transparent rounded-full animate-spin shadow-sm"></div>
        <p class="text-textSecondary text-sm font-semibold tracking-wide animate-pulse">{{ store.uploadLoading ? 'Analyzing codebase...' : 'Decomposing architecture...' }}</p>
      </div>

      <!-- Error -->
      <div v-if="store.error && !store.loading" class="absolute top-20 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-none text-xs z-50 flex items-center gap-3 shadow-lg">
        <span>{{ store.error }}</span>
        <button @click="store.error = null" class="text-red-900 hover:text-red-700 transition font-bold">✕</button>
      </div>

      <!-- Graph -->
      <div v-if="store.architecture && !store.loading" class="flex-1 relative">
        <GraphCanvas />
        <PromptPanel v-if="store.promptPanelVisible" />
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

const inVsCode = ref(window.parent !== window);

const decomposeActiveWorkspace = () => {
  if (inVsCode.value) {
    store.uploadLoading = true;
    store.error = null;
    window.parent.postMessage({ command: "readWorkspaceFiles" }, "*");
  }
};

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.command === "workspaceFilesResult") {
    const payload = message.files.map((f: any) => ({
      path: f.path,
      content: f.content.slice(0, 8000),
    }));
    store.uploadCodebase(payload);
  }
});

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
.toolbar-btn { @apply text-xs bg-surface hover:bg-surfaceHover px-3.5 py-2 rounded-none text-textSecondary hover:text-textPrimary transition-all border border-borderMuted flex items-center gap-1.5 shadow-sm font-bold duration-150; }
.toolbar-btn-stale { @apply border-red-900/35 text-red-400 bg-red-950/20 hover:bg-red-950/40; }
</style>
