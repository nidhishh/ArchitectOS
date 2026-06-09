# ArchitectOS Launch Roadmap: Tasks to Completion

This checklist tracks the engineering, UX, and deployment milestones required to ready **ArchitectOS** for production launch.

---

## 🚀 Milestone 1: Multi-Provider LLM Engine
Provide robust and flexible AI provider support to make the platform accessible to developers without local setups or specific Nvidia NIM keys.

- [ ] **Dynamic Provider Configuration via UI**
  - Create a settings panel in the frontend to let users select their AI provider (`Ollama`, `Nvidia NIM`, `OpenAI`, `Gemini`, `Anthropic`).
  - Allow keys and endpoints to be entered directly in the browser and stored in `localStorage` or sent as headers.
- [ ] **OpenAI & Gemini API Handlers**
  - [ ] Implement `OpenAiHandler` for standard GPT models.
  - [ ] Implement `GeminiHandler` for native Gemini API support.
- [ ] **Graceful Failures & Fallbacks**
  - Implement automatic fallbacks: if an API call fails (e.g. rate limit, invalid key), prompt the user to fall back to the local Ollama engine or standard file-tree generation without AI.

---

## 🛠️ Milestone 2: Polyglot Code Parsing (Beyond JS/TS)
Expand static analysis support so developers using other popular languages can map their codebases.

- [ ] **Polyglot Parser Fallbacks**
  - [ ] Implement a fallback regex/AST parser for `.py` (Python) files.
  - [ ] Implement basic parser support for `.go` (Go) files.
  - [ ] Implement basic parser for `.java` / `.kt` (Java/Kotlin) files.
- [ ] **Improve Parsing Error Resilience**
  - When Babel fails (e.g., `Babel failed to parse: Unterminated string constant`), display a non-intrusive warning badge in the stats panel showing which files had minor syntax issues rather than failing silently in terminal logs.
- [ ] **Large Codebase Chunking & Filtering**
  - When analyzing codebases larger than 100 files, automatically exclude `dist`, `build`, `coverage`, and other build artifacts to avoid wasting LLM context window tokens.

---

## 🎨 Milestone 3: Frontend UX Polish & Interactive Editor
Make the workspace UI look premium, functional, and fully interactive.

- [ ] **Graph Export Utility**
  - Add an export button to download the current architecture graph as a high-quality `PNG` or `SVG` image.
- [ ] **Persistence & Projects Management**
  - Allow saving and loading multiple "Projects" (saving the generated graph structure + descriptions + custom modifications) using browser IndexedDB or JSON file exports.
- [ ] **Visual Theme Tuning**
  - Refine CSS layout styles to ensure smooth zoom/pan animations on massive graphs, and fix node card overlap issues.
- [ ] **Responsive Design Audit**
  - Optimize layout wrappers to support standard laptop displays, tablets, and ultrawide monitors cleanly.

---

## 📦 Milestone 4: Deployment & Security
Prepare ArchitectOS for seamless hosting and setup.

- [ ] **Dockerization**
  - Create a root `Dockerfile` and a `docker-compose.yml` to bundle the Vue frontend (static build served by Nginx) and Express backend in a single container.
- [ ] **Production Environment Configurations**
  - Secure backend endpoints against arbitrary uploads and configure CORS rules properly for the production domain.
- [ ] **Deployment Guide & Quickstart Scripts**
  - Write a one-command bootstrap script (`setup.sh`/`setup.ps1`) for self-hosters to pull, build, and run the app.
