<template>
  <div class="fixed inset-4 bg-bg/95 backdrop-blur-xl z-50 rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-white/5">
      <h3 class="text-lg font-semibold text-accent">💻 Code View</h3>
      <button class="text-textSecondary hover:text-white transition text-xl px-2" @click="$emit('close')">✕</button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- File tree sidebar -->
      <div class="w-[260px] border-r border-white/5 overflow-y-auto p-3 bg-surface/30">
        <div class="text-[10px] text-textSecondary uppercase tracking-wider mb-2 px-1">File Explorer</div>
        <div
          v-for="file in fileTree"
          :key="file.path"
          :style="{ paddingLeft: file.indent * 14 + 'px' }"
          :class="[
            'flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer text-xs transition',
            file.isDir ? 'text-accent/80' : (selectedFile === file.path ? 'bg-accent/20 text-white' : 'text-textSecondary hover:text-white hover:bg-white/5')
          ]"
          @click="!file.isDir && selectFile(file.path)"
        >
          <span class="text-[11px]">{{ file.isDir ? (expanded.has(file.dirPath!) ? '📂' : '📁') : fileIcon(file.name) }}</span>
          <span class="truncate">{{ file.name }}</span>
        </div>
      </div>

      <!-- Code viewer -->
      <div class="flex-1 overflow-auto p-0">
        <div v-if="!selectedFile" class="h-full flex items-center justify-center text-textSecondary text-sm">
          Select a file to view its code
        </div>
        <div v-else class="flex flex-col h-full">
          <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-surface/30">
            <span class="text-xs text-accent font-mono">{{ selectedFile }}</span>
          </div>
          <div class="flex-1 overflow-auto">
            <pre class="p-4 text-xs font-mono leading-relaxed"><code class="text-green-400/90">{{ selectedCode }}</code></pre>
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
