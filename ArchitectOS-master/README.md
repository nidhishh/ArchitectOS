# ArchitectOS

A local-first AI architecture visualizer. Describe any system and watch it decompose into an interactive, drillable graph — or upload your existing codebase to visualize it.

**Powered by Ollama (free, local AI). No API keys. No billing. No cloud.**

![License](https://img.shields.io/badge/license-MIT-blue)
![AI](https://img.shields.io/badge/AI-Ollama-green)
![Framework](https://img.shields.io/badge/frontend-Vue%203-brightgreen)

## ✨ Features

### Core
- **AI Decompose** — describe any system, AI generates a multi-level architecture graph
- **Hybrid Mode** — AI generates the base, then edit/add/delete nodes inline
- **Drill-down** — click any node to zoom into its children; breadcrumb navigation back
- **Syntax Toggle** — hide code, show pseudocode, or show real implementation code

### Autonomy Levels
| Level | Depth | What you get |
|-------|-------|-------------|
| Beginner | 1 | High-level system overview |
| Intermediate | 2 | Subsystems + data flow |
| Advanced | 3 | Internal mechanisms, auth, protocols |
| Expert | 4 | Full implementation detail |

### Tools
- **📝 README Generator** — auto-generates a professional README from your architecture; turns red when stale
- **📁 File Structure** — view the generated project's file tree
- **📦 Download ZIP** — download everything (code, README, config) as a ready-to-use project
- **📤 Upload Codebase** — upload a ZIP or source files to reverse-engineer into a flowchart
- **🗺️ Minimap** — birds-eye view of the full graph
- **🔎 Zoom Controls** — zoom in/out and fit-to-view

### Quality of Life
- **Persistent state** — refresh the page and everything is still there (localStorage)
- **Prompt history** — quickly re-run recent prompts
- **Error handling** — clear error messages with dismiss button
- **No overlap** — tree-aware layout allocates space proportionally

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/) with a model installed

## Quick Start

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a model
ollama pull llama3.1:8b

# 3. Clone & install
git clone https://github.com/ThatDeparted2061/ArchitectOS.git
cd ArchitectOS
npm install

# 4. Run
npm run dev
```

Open **http://localhost:5173**

> First generation takes 15-30s (model loading into RAM). Subsequent ones are faster.

## Configuration

Edit `backend/.env`:

```env
AI_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Swap `OLLAMA_MODEL` for any model: `mistral`, `codellama`, `llama3.1:70b`, etc.

## Modes

| Mode | Description |
|------|-------------|
| **AI Decompose** | Prompt → AI generates full architecture |
| **Hybrid** | AI generates → you edit, add, or delete nodes |
| **Manual Mode** | Build from scratch *(coming soon)* |

## How Upload Works

1. Click **📤 Upload Codebase**
2. Select source files or a ZIP archive
3. AI analyzes the code structure and generates an architecture flowchart
4. Edit in Hybrid mode, download as ZIP, or generate a README

Supports: `.js`, `.ts`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.vue`, `.svelte`, and 30+ other file types.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite, Vue Flow, Pinia, Tailwind CSS |
| Backend | Express, TypeScript |
| AI | Ollama (local LLM) |

## Project Structure

```
architect-os/
├── backend/
│   ├── index.ts          # Express API server
│   ├── mock/             # Fallback mock data
│   └── .env              # Configuration
├── frontend/
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── services/     # API + graph layout
│   │   ├── store/        # Pinia state management
│   │   └── App.vue       # Main app
│   └── ...
└── package.json          # Workspace root
```

## License

MIT
