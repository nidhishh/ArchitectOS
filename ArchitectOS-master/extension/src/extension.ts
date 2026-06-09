import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

let serverProcess: cp.ChildProcess | null = null;
let backendOutputChannel: vscode.OutputChannel | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('ArchitectOS Extension Activated.');

  // Create VS Code Output Channel for backend logs
  backendOutputChannel = vscode.window.createOutputChannel("ArchitectOS Backend");
  backendOutputChannel.appendLine("Starting ArchitectOS Express Backend...");
  backendOutputChannel.show(); // Automatically focus output channel

  // Start Express backend process automatically
  const backendPath = path.join(context.extensionPath, '../backend/index.ts');
  try {
    serverProcess = cp.spawn('npx', ['tsx', backendPath], {
      cwd: path.join(context.extensionPath, '../backend'),
      shell: true,
      env: { ...process.env, PORT: '3000', AI_ENABLED: 'true' }
    });

    serverProcess.stdout?.on('data', (data) => {
      backendOutputChannel?.append(data.toString());
    });
    serverProcess.stderr?.on('data', (data) => {
      backendOutputChannel?.append(`[Error] ${data.toString()}`);
    });
  } catch (err: any) {
    backendOutputChannel?.appendLine(`Failed to start backend server process: ${err.message}`);
  }

  // Register dashboard command
  let disposable = vscode.commands.registerCommand('architectos.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'architectos',
      'ArchitectOS Visualizer',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        portMapping: [
          { webviewPort: 5173, extensionHostPort: 5173 },
          { webviewPort: 3000, extensionHostPort: 3000 }
        ]
      }
    );

    // Setup basic HTML that embeds the iframe pointing to Vite dev server
    panel.webview.html = getWebviewContent();

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'readWorkspaceFiles') {
        try {
          const uris = await vscode.workspace.findFiles(
            '**/*.{js,ts,jsx,tsx,py,go,java,rs,c,cpp,h,rb,php,cs,swift,kt}',
            '{**/node_modules/**,**/.venv/**,**/venv/**,**/.git/**,**/.vscode/**,**/dist/**,**/build/**}'
          );
          const sliced = uris.slice(0, 40);
          const files = [];
          for (const uri of sliced) {
            const contentBuffer = await vscode.workspace.fs.readFile(uri);
            const content = new TextDecoder('utf-8').decode(contentBuffer);
            const relativePath = vscode.workspace.asRelativePath(uri);
            files.push({ path: relativePath, content });
          }
          // Send files back to the Webview (which then forwards them to the iframe)
          panel.webview.postMessage({ command: 'workspaceFilesResult', files });
        } catch (error: any) {
          vscode.window.showErrorMessage('Failed to read workspace files: ' + error.message);
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src http://localhost:* https://localhost:* *; connect-src http://localhost:* ws://localhost:* *;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArchitectOS Dashboard</title>
</head>
<body style="margin: 0; padding: 0; overflow: hidden; background: #0b0f19;">
    <!-- Point to Vite dev server -->
    <iframe id="iframe" src="http://localhost:5173" style="width: 100vw; height: 100vh; border: none;"></iframe>
    <script>
        const vscode = acquireVsCodeApi();
        const iframe = document.getElementById('iframe');

        // Forward messages between Vite dev server and VS Code extension host
        window.addEventListener('message', (event) => {
            if (event.origin === 'http://localhost:5173') {
                vscode.postMessage(event.data);
            } else {
                iframe.contentWindow.postMessage(event.data, '*');
            }
        });
    </script>
</body>
</html>`;
}
