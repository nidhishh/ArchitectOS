<template>
  <div class="fixed inset-6 bg-surface z-50 rounded-none border border-borderMuted flex flex-col overflow-hidden shadow-2xl select-none">
    <!-- Header -->
    <div class="flex items-center justify-between p-5 border-b border-borderMuted bg-surfaceHover">
      <h3 class="text-base font-semibold text-textPrimary flex items-center gap-2.5">
        <div class="p-1 bg-accentLight text-accent rounded-none border border-accent/15">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <span>Workspace Code Viewer</span>
      </h3>
      <button class="text-textSecondary hover:text-textPrimary transition duration-200" @click="$emit('close')">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- File tree sidebar -->
      <div class="w-[280px] border-r border-borderMuted overflow-y-auto p-4 bg-bg">
        <div class="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-3.5 px-1 opacity-60">File Explorer</div>
        <div class="space-y-1">
          <div
            v-for="file in fileTree"
            :key="file.path"
            :style="{ paddingLeft: file.indent * 14 + 'px' }"
            :class="[
              'flex items-center gap-2 px-2.5 py-1.5 rounded-none cursor-pointer text-xs transition duration-200',
              file.isDir 
                ? 'text-accent font-medium hover:bg-surfaceHover' 
                : (selectedFile === file.path ? 'bg-accentLight border border-accent/20 text-textPrimary font-semibold shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover border border-transparent')
            ]"
            @click="!file.isDir && selectFile(file.path)"
          >
            <!-- Directory / File SVGs -->
            <svg v-if="file.isDir" class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <svg v-else class="w-3.5 h-3.5 text-textSecondary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="truncate">{{ file.name }}</span>
          </div>
        </div>
      </div>

      <!-- Code viewer -->
      <div class="flex-1 overflow-auto p-0 bg-surface">
        <div v-if="!selectedFile" class="h-full flex flex-col items-center justify-center text-textSecondary/40 text-sm gap-2">
          <svg class="w-8 h-8 text-textSecondary/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="font-medium tracking-wide">Select a file from explorer to view codebase</span>
        </div>
        <div v-else class="flex flex-col h-full">
          <div class="flex items-center gap-2 px-5 py-3 border-b border-borderMuted bg-bg">
            <span class="text-xs text-accent font-mono font-semibold">{{ selectedFile }}</span>
          </div>
          <div class="flex-1 overflow-auto select-text">
            <pre class="p-6 text-xs font-mono leading-relaxed text-textPrimary"><code class="block whitespace-pre overflow-x-auto">{{ selectedCode }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{ architecture: any }>();
defineEmits(["close"]);

const selectedFile = ref("");
const expanded = ref(new Set<string>());

interface TreeItem {
  path: string;
  name: string;
  indent: number;
  isDir: boolean;
  dirPath?: string;
  code?: string;
}

// Build code files from architecture
function collectFiles(node: any, basePath = "src"): { path: string; code: string }[] {
  const files: { path: string; code: string }[] = [];
  const dirName = node.id.replace(/[^a-z0-9-_]/gi, "-");
  const currentPath = basePath ? `${basePath}/${dirName}` : dirName;

  const header = `/**\n * ${node.title}\n * ${node.description}\n */\n\n`;

  if (node.code) {
    files.push({ path: `${currentPath}/index.ts`, code: header + node.code });
  } else {
    files.push({
      path: `${currentPath}/index.ts`,
      code: header + `// TODO: Implement ${node.title}\n\nexport default {};\n`,
    });
  }

  for (const child of node.children || []) {
    files.push(...collectFiles(child, currentPath));
  }

  return files;
}

const codeFiles = computed(() => {
  if (!props.architecture) return [];
  const files = collectFiles(props.architecture);
  // Add package.json and tsconfig
  files.unshift({
    path: "package.json",
    code: JSON.stringify({
      name: props.architecture.title?.toLowerCase().replace(/\s+/g, "-") || "project",
      version: "1.0.0",
      description: props.architecture.description || "",
      main: "src/index.ts",
      scripts: { build: "tsc", start: "node dist/index.js" },
      devDependencies: { typescript: "^5.0.0" },
    }, null, 2),
  });
  files.unshift({
    path: "tsconfig.json",
    code: JSON.stringify({
      compilerOptions: { target: "ES2020", module: "ESNext", outDir: "./dist", rootDir: "./src", strict: true },
      include: ["src/**/*"],
    }, null, 2),
  });
  return files;
});

const fileTree = computed((): TreeItem[] => {
  const items: TreeItem[] = [];
  const dirs = new Set<string>();

  for (const f of codeFiles.value) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  const allPaths = [
    ...Array.from(dirs).map((d) => ({ path: d + "/", isDir: true })),
    ...codeFiles.value.map((f) => ({ path: f.path, isDir: false })),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const seen = new Set<string>();
  for (const item of allPaths) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    const clean = item.isDir ? item.path.slice(0, -1) : item.path;
    const parts = clean.split("/");
    items.push({
      path: item.path,
      name: parts[parts.length - 1],
      indent: parts.length - 1,
      isDir: item.isDir,
      dirPath: item.isDir ? clean : undefined,
    });
  }

  return items;
});

const selectedCode = computed(() => {
  const file = codeFiles.value.find((f) => f.path === selectedFile.value);
  return file?.code || "";
});

function selectFile(path: string) {
  selectedFile.value = path;
}

function fileIcon(name: string) {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "🟦";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "🟨";
  if (name.endsWith(".json")) return "📋";
  if (name.endsWith(".vue")) return "🟩";
  if (name.endsWith(".py")) return "🐍";
  return "📄";
}
</script>
