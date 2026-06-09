import * as path from "node:path";
import * as vscode from "vscode";

type OutputTarget = "codex" | "copilot";
type CopilotRoute = "chat" | "model";
type CopilotChatMode = "ask" | "edit" | "agent";
type Verbosity = "Brief" | "Normal" | "Detailed";
type SendAction = "new" | "add";
type SendLevel = "simple" | "normal" | "thinking";

interface InitialCommand {
  value: string;
  label: string;
  text: string;
}

interface AgentPreset {
  value: string;
  label: string;
}

interface ContextItem {
  id: string;
  label: string;
  path: string;
  uri: string;
  type: "file" | "folder" | "selection";
}

interface ScopeState {
  useTools: boolean;
  readRepoContext: boolean;
  searchRepo: boolean;
  askBeforeChanges: boolean;
  writeCode: boolean;
  writeDocs: boolean;
  runTests: boolean;
  webLookup: boolean;
  existingContext: boolean;
}

interface PrompterSettings {
  saveLocation: string;
  fileLocation: string;
  promptFooter: string;
  outputTarget: OutputTarget;
  copilotRoute: CopilotRoute;
  copilotChatMode: CopilotChatMode;
  outputFormat: string;
  defaultVerbosity: Verbosity;
  simpleAgent: string;
  normalAgent: string;
  thinkingAgent: string;
  includeMetadata: boolean;
  includeChecklist: boolean;
  maxFileReads: number;
  maxFilesChanged: number;
  confirmBroadSearch: boolean;
  confirmPackageInstall: boolean;
  confirmToolUse: boolean;
  confirmFileEdits: boolean;
  submitCopilotChat: boolean;
  allowBroadRepoSearch: boolean;
  allowWebLookup: boolean;
  allowPackageInstall: boolean;
  allowTests: boolean;
  stopAfterPlan: boolean;
  preferExistingContext: boolean;
}

interface PrompterState {
  activeTab: "prompt" | "preview" | "settings";
  title: string;
  createDocument: boolean;
  command: string;
  location: string;
  verbosity: Verbosity;
  scopeExpanded: boolean;
  scope: ScopeState;
  prompt: string;
  contextItems: ContextItem[];
  settings: PrompterSettings;
}

interface SavedPrompt {
  fileName: string;
  path: string;
  title: string;
  updatedAt: string;
}

const stateKey = "prompter.state";

const initialCommands: InitialCommand[] = [
  { value: "", label: "Type", text: "" },
  { value: "rca", label: "RCA", text: "Create a file for an RCA." },
  { value: "roadmap", label: "Roadmap", text: "Create a file for a roadmap." },
  { value: "issue", label: "Issue", text: "Create a file for an issue." },
  { value: "design", label: "Design", text: "Create a file for a design." },
  { value: "decision-record", label: "Decision record", text: "Create a file for a decision record." },
  { value: "test-plan", label: "Test plan", text: "Create a file for a test plan." },
  { value: "release-notes", label: "Release notes", text: "Create a file for release notes." }
];

const agentPresets: AgentPreset[] = [
  { value: "codex-low", label: "Codex low" },
  { value: "codex-medium", label: "Codex medium" },
  { value: "codex-high", label: "Codex high" },
  { value: "copilot-fast", label: "Copilot fast" },
  { value: "copilot-balanced", label: "Copilot balanced" },
  { value: "copilot-thinking", label: "Copilot thinking" }
];

function defaultState(): PrompterState {
  return {
    activeTab: "prompt",
    title: "Roadmap controls",
    createDocument: true,
    command: "roadmap",
    location: ".my/plan",
    verbosity: "Brief",
    scopeExpanded: true,
    scope: {
      useTools: false,
      readRepoContext: false,
      searchRepo: false,
      askBeforeChanges: true,
      writeCode: false,
      writeDocs: true,
      runTests: false,
      webLookup: false,
      existingContext: true
    },
    prompt: "",
    contextItems: [],
    settings: {
      saveLocation: ".my/prompts",
      fileLocation: ".my/plan",
      promptFooter: "",
      outputTarget: "codex",
      copilotRoute: "chat",
      copilotChatMode: "agent",
      outputFormat: "Markdown",
      defaultVerbosity: "Brief",
      simpleAgent: "codex-low",
      normalAgent: "codex-medium",
      thinkingAgent: "codex-high",
      includeMetadata: true,
      includeChecklist: false,
      maxFileReads: 3,
      maxFilesChanged: 2,
      confirmBroadSearch: true,
      confirmPackageInstall: true,
      confirmToolUse: false,
      confirmFileEdits: true,
      submitCopilotChat: false,
      allowBroadRepoSearch: false,
      allowWebLookup: false,
      allowPackageInstall: false,
      allowTests: true,
      stopAfterPlan: false,
      preferExistingContext: true
    }
  };
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new PrompterViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PrompterViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    vscode.commands.registerCommand("prompter.open", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.prompter");
    }),
    vscode.commands.registerCommand("prompter.addFileToPrompt", async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
      await provider.addExplorerItems(collectUris(uri, uris), false);
    }),
    vscode.commands.registerCommand("prompter.addFileToChat", async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
      await provider.addExplorerItems(collectUris(uri, uris), true);
    })
  );
}

export function deactivate() {
  // No background resources to dispose.
}

class PrompterViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "prompter.sidebar";

  private view?: vscode.WebviewView;
  private state: PrompterState;
  private codexTerminal?: vscode.Terminal;
  private copilotOutput?: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.state = mergeState(defaultState(), this.context.workspaceState.get<Partial<PrompterState>>(stateKey));
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => void this.handleMessage(message));
    void this.postSnapshot();
  }

  async addExplorerItems(uris: vscode.Uri[], sendToChat: boolean): Promise<void> {
    if (!uris.length) {
      return;
    }

    for (const uri of uris) {
      await this.addContextUri(uri);
    }
    await this.persistAndPost();
    await vscode.commands.executeCommand("workbench.view.extension.prompter");

    if (sendToChat) {
      await this.sendPrompt("add", "normal", `Added ${uris.length} item(s) from Explorer.`);
    } else {
      vscode.window.showInformationMessage(`Added ${uris.length} item(s) to Prompter context.`);
    }
  }

  private async handleMessage(message: { type: string; [key: string]: unknown }): Promise<void> {
    switch (message.type) {
      case "ready":
        await this.postSnapshot();
        break;
      case "updateState":
        this.state = mergeState(this.state, message.state as Partial<PrompterState>);
        await this.persistAndPost();
        break;
      case "selectContext":
        await this.selectContext();
        break;
      case "removeContext":
        this.state.contextItems = this.state.contextItems.filter((item) => item.id !== message.id);
        await this.persistAndPost();
        break;
      case "savePrompt":
        await this.savePrompt();
        break;
      case "copyPreview":
        await vscode.env.clipboard.writeText(this.composePrompt());
        vscode.window.showInformationMessage("Prompter preview copied.");
        break;
      case "sendPrompt":
        await this.sendPrompt(message.action as SendAction, message.level as SendLevel);
        break;
      case "reset":
        this.state = defaultState();
        await this.persistAndPost();
        break;
      case "openSavedPrompt":
        await this.openSavedPrompt(String(message.path ?? ""));
        break;
    }
  }

  private async selectContext(): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: true,
      openLabel: "Select context"
    });

    if (!selected) {
      return;
    }

    for (const uri of selected) {
      await this.addContextUri(uri);
    }
    await this.persistAndPost();
  }

  private async addContextUri(uri: vscode.Uri): Promise<void> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri) ?? firstWorkspaceFolder();
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, "/")
      : vscode.workspace.asRelativePath(uri, false);
    const normalizedPath = relativePath || path.basename(uri.fsPath);

    if (this.state.contextItems.some((item) => item.uri === uri.toString())) {
      return;
    }

    let type: ContextItem["type"] = "file";
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        type = "folder";
      }
    } catch {
      type = "file";
    }

    this.state.contextItems.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: path.basename(uri.fsPath) || normalizedPath,
      path: normalizedPath,
      uri: uri.toString(),
      type
    });
  }

  private async savePrompt(): Promise<void> {
    const workspaceFolder = firstWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("Open a workspace folder before saving prompts.");
      return;
    }

    const saveLocation = sanitizeRelativeDirectory(this.state.settings.saveLocation || ".my/prompts");
    const promptsDir = vscode.Uri.joinPath(workspaceFolder.uri, ...saveLocation.split("/"));
    await vscode.workspace.fs.createDirectory(promptsDir);

    const now = new Date();
    const fileName = `${timestampForFile(now)}-${slugify(this.state.title || "prompt")}.md`;
    const fileUri = vscode.Uri.joinPath(promptsDir, fileName);
    const content = this.composePromptMarkdown(fileName, now);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, "utf8"));
    await this.postSnapshot();
    vscode.window.showInformationMessage(`Saved ${saveLocation}/${fileName}`);
  }

  private async sendPrompt(action: SendAction, level: SendLevel, prefix?: string): Promise<void> {
    const prompt = this.composePrompt();

    const outputTarget = this.state.settings.outputTarget;
    if (outputTarget === "codex") {
      const launched = await this.runCodexInTerminal(action, level, prompt);
      if (launched) {
        vscode.window.showInformationMessage(`${prefix ? `${prefix} ` : ""}Prompter sent ${levelLabel(level)} prompt to Codex.`);
        return;
      }
      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showWarningMessage(`${prefix ? `${prefix} ` : ""}Could not find Codex. Prompt copied instead.`);
      return;
    }

    if (this.state.settings.copilotRoute === "chat") {
      const opened = await openCopilotChatWithPrompt(
        prompt,
        this.state.settings.copilotChatMode,
        this.state.settings.submitCopilotChat
      );
      if (opened) {
        const verb = this.state.settings.submitCopilotChat ? "submitted" : "staged";
        vscode.window.showInformationMessage(`${prefix ? `${prefix} ` : ""}Prompter ${verb} ${levelLabel(level)} prompt in Copilot Chat.`);
        return;
      }

      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showWarningMessage(`${prefix ? `${prefix} ` : ""}Could not open Copilot Chat. Prompt copied instead.`);
      return;
    }

    const sent = await this.runCopilotLanguageModel(level, prompt);
    if (sent) {
      vscode.window.showInformationMessage(`${prefix ? `${prefix} ` : ""}Prompter sent ${levelLabel(level)} prompt to Copilot.`);
      return;
    }

    await vscode.env.clipboard.writeText(prompt);
    const openChat = "Open Copilot Chat";
    const choice = await vscode.window.showWarningMessage(
      `${prefix ? `${prefix} ` : ""}No Copilot model is selectable right now. Sign in, enable Copilot, or pick a model in Chat. Prompt copied instead.`,
      openChat
    );
    if (choice === openChat) {
      await openCopilotChatWithPrompt(prompt, this.state.settings.copilotChatMode, false);
    }
  }

  private async runCopilotLanguageModel(level: SendLevel, prompt: string): Promise<boolean> {
    const model = await selectCopilotModel(level, this.state.settings, this.context);
    if (!model) {
      return false;
    }

    const channel = this.getCopilotOutputChannel();
    channel.clear();
    channel.show(true);
    channel.appendLine(`Prompter -> Copilot ${levelLabel(level)}`);
    channel.appendLine(`Model: ${model.name} (${model.vendor}/${model.family})`);
    channel.appendLine("");

    try {
      const response = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Sending ${levelLabel(level)} prompt to Copilot`,
          cancellable: true
        },
        async (_progress, token) => model.sendRequest(
          [vscode.LanguageModelChatMessage.User(prompt)],
          {
            justification: "Prompter sends the bounded prompt you clicked to the selected Copilot language model."
          },
          token
        )
      );

      let text = "";
      for await (const chunk of response.text) {
        text += chunk;
        channel.append(chunk);
      }
      channel.appendLine("");

      await this.openCopilotResponseDocument(text, level, model);
      return true;
    } catch (error) {
      channel.appendLine("");
      channel.appendLine(`Error: ${errorMessage(error)}`);
      vscode.window.showWarningMessage(`Copilot request failed: ${errorMessage(error)} Prompt copied instead.`);
      return false;
    }
  }

  private async runCodexInTerminal(action: SendAction, level: SendLevel, prompt: string): Promise<boolean> {
    const workspaceFolder = firstWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("Open a workspace folder before sending to Codex.");
      return false;
    }

    const codexExecutable = findCodexExecutable();
    if (!codexExecutable) {
      return false;
    }

    const promptFile = await this.writeStagedPrompt(prompt);
    const sandbox = this.state.scope.writeCode || this.state.scope.writeDocs ? "workspace-write" : "read-only";
    const effort = effortForLevel(level, this.state.settings);
    const verbosity = verbosityForPrompt(this.state.verbosity);
    const terminal = this.getCodexTerminal(workspaceFolder.uri.fsPath);
    terminal.show();
    terminal.sendText(buildCodexTerminalCommand({
      action,
      codexExecutable,
      cwd: workspaceFolder.uri.fsPath,
      effort,
      promptPath: promptFile.fsPath,
      sandbox,
      verbosity
    }));

    try {
      await vscode.commands.executeCommand("chatgpt.openSidebar");
    } catch {
      // The terminal run is already started; opening the sidebar is best effort.
    }

    return true;
  }

  private getCodexTerminal(cwd: string): vscode.Terminal {
    if (this.codexTerminal) {
      return this.codexTerminal;
    }

    this.codexTerminal = vscode.window.createTerminal({
      name: "Prompter Codex",
      cwd,
      shellPath: process.platform === "win32" ? "powershell.exe" : undefined
    });
    return this.codexTerminal;
  }

  private getCopilotOutputChannel(): vscode.OutputChannel {
    if (!this.copilotOutput) {
      this.copilotOutput = vscode.window.createOutputChannel("Prompter Copilot");
      this.context.subscriptions.push(this.copilotOutput);
    }
    return this.copilotOutput;
  }

  private async openCopilotResponseDocument(text: string, level: SendLevel, model: vscode.LanguageModelChat): Promise<void> {
    const content = [
      `# Copilot Response (${levelLabel(level)})`,
      "",
      `Model: ${model.name} (${model.vendor}/${model.family})`,
      "",
      text.trim() || "_No response text was returned._",
      ""
    ].join("\n");
    const document = await vscode.workspace.openTextDocument({ language: "markdown", content });
    await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Beside });
  }

  private async writeStagedPrompt(prompt: string): Promise<vscode.Uri> {
    const dir = vscode.Uri.joinPath(this.context.globalStorageUri, "staged");
    await vscode.workspace.fs.createDirectory(dir);
    const file = vscode.Uri.joinPath(dir, "codex-prompt.md");
    await vscode.workspace.fs.writeFile(file, Buffer.from(prompt, "utf8"));
    return file;
  }

  private async openSavedPrompt(relativePromptPath: string): Promise<void> {
    const workspaceFolder = firstWorkspaceFolder();
    if (!workspaceFolder || !relativePromptPath) {
      return;
    }

    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, ...relativePromptPath.split("/"));
    try {
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch {
      vscode.window.showErrorMessage(`Could not open ${relativePromptPath}.`);
    }
  }

  private async persistAndPost(): Promise<void> {
    await this.context.workspaceState.update(stateKey, this.state);
    await this.postSnapshot();
  }

  private async postSnapshot(): Promise<void> {
    if (!this.view) {
      return;
    }

    this.view.webview.postMessage({
      type: "snapshot",
      state: this.state,
      initialCommands,
      agents: agentPresets,
      preview: this.composePrompt(),
      savedPrompts: await this.listSavedPrompts()
    });
  }

  private async listSavedPrompts(): Promise<SavedPrompt[]> {
    const workspaceFolder = firstWorkspaceFolder();
    if (!workspaceFolder) {
      return [];
    }

    const saveLocation = sanitizeRelativeDirectory(this.state.settings.saveLocation || ".my/prompts");
    const promptsDir = vscode.Uri.joinPath(workspaceFolder.uri, ...saveLocation.split("/"));
    try {
      const entries = await vscode.workspace.fs.readDirectory(promptsDir);
      const prompts: SavedPrompt[] = [];
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.endsWith(".md")) {
          continue;
        }
        const fileUri = vscode.Uri.joinPath(promptsDir, name);
        const stat = await vscode.workspace.fs.stat(fileUri);
        prompts.push({
          fileName: name,
          path: `${saveLocation}/${name}`,
          title: name.replace(/^\d{4}-.+?-/, "").replace(/\.md$/, "").replace(/-/g, " "),
          updatedAt: new Date(stat.mtime).toLocaleString()
        });
      }
      return prompts.sort((a, b) => b.fileName.localeCompare(a.fileName)).slice(0, 10);
    } catch {
      return [];
    }
  }

  private composePromptMarkdown(fileName: string, now: Date): string {
    const prompt = this.composePrompt();
    const command = this.state.createDocument ? selectedInitialCommand(this.state.command) : undefined;
    const metadata = this.state.settings.includeMetadata
      ? [
          "---",
          `title: ${JSON.stringify(this.state.title || "Untitled prompt")}`,
          `createDocument: ${this.state.createDocument ? "true" : "false"}`,
          `command: ${JSON.stringify(command?.value ?? "")}`,
          `commandLabel: ${JSON.stringify(command?.label ?? "")}`,
          `createdAt: ${JSON.stringify(now.toISOString())}`,
          `updatedAt: ${JSON.stringify(now.toISOString())}`,
          `fileName: ${JSON.stringify(fileName)}`,
          `outputFormat: ${JSON.stringify(this.state.settings.outputFormat)}`,
          `outputTarget: ${JSON.stringify(this.state.settings.outputTarget)}`,
          `copilotRoute: ${JSON.stringify(this.state.settings.copilotRoute)}`,
          `copilotChatMode: ${JSON.stringify(this.state.settings.copilotChatMode)}`,
          `verbosity: ${JSON.stringify(this.state.verbosity)}`,
          `location: ${JSON.stringify(this.state.createDocument ? this.state.location : "")}`,
          "context:",
          ...this.state.contextItems.map((item) => `  - ${JSON.stringify(item.path)}`),
          `includeChecklist: ${this.state.settings.includeChecklist ? "true" : "false"}`,
          "---",
          ""
        ].join("\n")
      : "";

    return `${metadata}# ${this.state.title || "Untitled prompt"}\n\n## Prompt\n\n${prompt}\n`;
  }

  private composePrompt(): string {
    const lines: string[] = [];
    if (this.state.createDocument) {
      const command = selectedInitialCommand(this.state.command);
      lines.push(command?.text || "Create a file.");

      const location = this.state.location.trim();
      if (location) {
        lines.push(`Put the created file under ${location}.`);
      }
    }

    if (this.state.contextItems.length) {
      lines.push("Use selected context only:");
      for (const item of this.state.contextItems) {
        lines.push(`- ${item.path}`);
      }
    }

    lines.push(verbosityInstruction(this.state.verbosity));
    lines.push(...scopeInstructions(this.state.scope));
    lines.push(...settingsInstructions(this.state.settings));

    const prompt = this.state.prompt.trim();
    if (prompt) {
      lines.push("");
      lines.push(prompt);
    }

    const footer = this.state.settings.promptFooter.trim();
    if (footer) {
      lines.push("");
      lines.push(footer);
    }

    return lines.join("\n").trim();
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>Prompter</title>
<style>
:root {
  color-scheme: light dark;
  --gap: 8px;
}
body {
  margin: 0;
  padding: 10px;
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}
button, input, select, textarea {
  font: inherit;
}
button {
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 3px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  padding: 4px 7px;
}
button.secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}
button.link {
  border: 0;
  background: transparent;
  color: var(--vscode-textLink-foreground);
  padding: 0;
}
input, select, textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 2px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  padding: 4px 5px;
}
textarea {
  min-height: 96px;
  resize: vertical;
  line-height: 1.35;
}
label, .label {
  display: block;
  margin-top: 8px;
  margin-bottom: 3px;
  color: var(--vscode-descriptionForeground);
}
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}
.tab {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}
.panel {
  display: none;
}
.panel.active {
  display: block;
}
.context-list, .saved-list, .preview {
  border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-input-border, #555));
  border-radius: 3px;
  padding: 6px;
  background: var(--vscode-editor-background);
}
.context-list {
  margin-top: 6px;
}
.context-item, .saved-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px;
  align-items: center;
  margin-top: 4px;
}
.muted {
  color: var(--vscode-descriptionForeground);
  font-size: 0.92em;
}
.scope-body {
  display: none;
  margin-top: 4px;
}
.scope-body.open {
  display: block;
}
.check {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 4px 0;
}
.check input {
  width: auto;
}
.document-row {
  display: grid;
  grid-template-columns: auto minmax(86px, 0.8fr) minmax(112px, 1.2fr);
  gap: 6px;
  align-items: center;
  margin-top: 3px;
}
.document-row input[type="checkbox"] {
  width: auto;
  justify-self: start;
}
.document-row select,
.document-row input[type="text"] {
  min-width: 0;
}
.send-grid {
  display: grid;
  grid-template-columns: 42px repeat(3, 1fr);
  gap: 3px;
  align-items: center;
  margin-top: 5px;
}
.grid-head, .row-head {
  color: var(--vscode-descriptionForeground);
  font-size: 0.9em;
}
.send-grid button {
  padding-left: 3px;
  padding-right: 3px;
}
.send-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 8px;
}
.send-title .label {
  margin: 0;
}
.target-choice {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}
.target-choice .radio {
  color: var(--vscode-foreground);
  font-size: 0.92em;
  margin: 0;
}
.actions {
  display: flex;
  gap: 6px;
  margin-top: 9px;
}
.prompt-actions {
  align-items: center;
  flex-wrap: wrap;
}
.prompt-actions button {
  flex: 0 0 auto;
}
.preview {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 310px;
  overflow: auto;
}
.settings-line {
  display: flex;
  gap: 8px;
  margin: 5px 0;
}
.settings-line label {
  margin: 0;
  color: var(--vscode-foreground);
}
.radio {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 4px 0;
}
.radio input {
  width: auto;
}
</style>
</head>
<body>
<div class="tabs">
  <button class="tab active" data-tab="prompt">Prompt</button>
  <button class="tab" data-tab="preview">Preview</button>
  <button class="tab" data-tab="settings">Settings</button>
</div>
<section id="prompt" class="panel active">
  <label for="title">Title</label>
  <input id="title" data-field="title">
  <label for="createDocument">Create document</label>
  <div class="document-row">
    <input id="createDocument" type="checkbox" data-field="createDocument" aria-label="Create document">
    <select id="command" data-field="command" aria-label="Type"></select>
    <input id="location" type="text" data-field="location" aria-label="Location" placeholder="location">
  </div>
  <label for="verbosity">Verbosity</label>
  <select id="verbosity" data-field="verbosity">
    <option>Brief</option>
    <option>Normal</option>
    <option>Detailed</option>
  </select>
  <button id="scopeToggle" class="secondary" style="margin-top: 8px;">Scope</button>
  <div id="scopeBody" class="scope-body"></div>
  <label for="promptText">Prompt</label>
  <textarea id="promptText" data-field="prompt"></textarea>
  <div class="send-title">
    <div class="label">Send</div>
    <div class="target-choice" role="radiogroup" aria-label="Output target">
      <label class="radio"><input type="radio" name="promptOutputTarget" value="codex" data-output-target="codex"> Codex</label>
      <label class="radio"><input type="radio" name="promptOutputTarget" value="copilot" data-output-target="copilot"> Copilot</label>
    </div>
  </div>
  <div class="send-grid">
    <div></div><div class="grid-head">Simple</div><div class="grid-head">Normal</div><div class="grid-head">Think</div>
    <div class="row-head">New</div><button data-send="new:simple">Send</button><button data-send="new:normal">Send</button><button data-send="new:thinking">Send</button>
    <div class="row-head">Add</div><button data-send="add:simple">Send</button><button data-send="add:normal">Send</button><button data-send="add:thinking">Send</button>
  </div>
  <div class="label">Context</div>
  <button id="selectContext">Select context</button>
  <div id="contextList" class="context-list"></div>
  <div class="actions prompt-actions" aria-label="Prompt actions">
    <button id="savePrompt">Save</button>
    <button id="clearPrompt" class="secondary">Clear</button>
  </div>
</section>
<section id="preview" class="panel">
  <div class="actions">
    <button id="copyPreview">Copy</button>
    <button id="savePromptFromPreview">Save</button>
  </div>
  <div id="previewText" class="preview"></div>
  <div class="send-title">
    <div class="label">Send</div>
    <div class="target-choice" role="radiogroup" aria-label="Output target">
      <label class="radio"><input type="radio" name="previewOutputTarget" value="codex" data-output-target="codex"> Codex</label>
      <label class="radio"><input type="radio" name="previewOutputTarget" value="copilot" data-output-target="copilot"> Copilot</label>
    </div>
  </div>
  <div class="send-grid">
    <div></div><div class="grid-head">Simple</div><div class="grid-head">Normal</div><div class="grid-head">Think</div>
    <div class="row-head">New</div><button data-send="new:simple">Send</button><button data-send="new:normal">Send</button><button data-send="new:thinking">Send</button>
    <div class="row-head">Add</div><button data-send="add:simple">Send</button><button data-send="add:normal">Send</button><button data-send="add:thinking">Send</button>
  </div>
  <div class="label">Recent</div>
  <div id="savedList" class="saved-list"></div>
</section>
<section id="settings" class="panel">
  <label for="saveLocation">Save location</label>
  <input id="saveLocation" data-setting="saveLocation">
  <label for="fileLocation">File location</label>
  <input id="fileLocation" data-setting="fileLocation">
  <label for="promptFooter">Prompt footer</label>
  <textarea id="promptFooter" data-setting="promptFooter"></textarea>
  <label for="copilotRoute">Copilot route</label>
  <select id="copilotRoute" data-setting="copilotRoute">
    <option value="chat">Chat panel</option>
    <option value="model">Model API</option>
  </select>
  <label for="copilotChatMode">Copilot chat mode</label>
  <select id="copilotChatMode" data-setting="copilotChatMode">
    <option value="agent">Agent</option>
    <option value="ask">Ask</option>
    <option value="edit">Edit</option>
  </select>
  <label for="outputFormat">Format</label>
  <select id="outputFormat" data-setting="outputFormat">
    <option>Markdown</option>
    <option>Plain text</option>
    <option>JSON outline</option>
    <option>Checklist</option>
  </select>
  <label for="defaultVerbosity">Default verbosity</label>
  <select id="defaultVerbosity" data-setting="defaultVerbosity">
    <option>Brief</option>
    <option>Normal</option>
    <option>Detailed</option>
  </select>
  <label for="simpleAgent">Simple</label>
  <select id="simpleAgent" data-setting="simpleAgent"></select>
  <label for="normalAgent">Normal</label>
  <select id="normalAgent" data-setting="normalAgent"></select>
  <label for="thinkingAgent">Thinking</label>
  <select id="thinkingAgent" data-setting="thinkingAgent"></select>
  <div id="settingsChecks"></div>
  <label for="maxFileReads">Max file reads</label>
  <input id="maxFileReads" type="number" min="0" data-setting="maxFileReads">
  <label for="maxFilesChanged">Max files changed</label>
  <input id="maxFilesChanged" type="number" min="0" data-setting="maxFilesChanged">
  <div class="actions">
    <button id="saveSettings">Save Settings</button>
    <button id="resetSettings" class="secondary">Reset</button>
  </div>
</section>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let state = null;
let initialCommands = [];
let agents = [];
let savedPrompts = [];
let preview = "";
const scopeChecks = [
  ["useTools", "Use tools"],
  ["readRepoContext", "Read repo context"],
  ["searchRepo", "Search repo"],
  ["askBeforeChanges", "Ask before changes"],
  ["writeCode", "Write code"],
  ["writeDocs", "Write docs"],
  ["runTests", "Run tests"],
  ["webLookup", "Web lookup"],
  ["existingContext", "Existing context"]
];
const settingsChecks = [
  ["includeMetadata", "Include metadata"],
  ["includeChecklist", "Include checklist"],
  ["confirmBroadSearch", "Confirm broad search"],
  ["confirmPackageInstall", "Confirm package install"],
  ["confirmToolUse", "Confirm tool use"],
  ["confirmFileEdits", "Confirm file edits"],
  ["submitCopilotChat", "Submit Copilot Chat"],
  ["allowBroadRepoSearch", "Broad repo search"],
  ["allowWebLookup", "Web lookup"],
  ["allowPackageInstall", "Package install"],
  ["allowTests", "Tests"],
  ["stopAfterPlan", "Stop after plan"],
  ["preferExistingContext", "Existing context"]
];
window.addEventListener("message", (event) => {
  if (event.data.type !== "snapshot") return;
  state = event.data.state;
  initialCommands = event.data.initialCommands;
  agents = event.data.agents;
  savedPrompts = event.data.savedPrompts;
  preview = event.data.preview;
  render();
});
document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab) setTab(tab.dataset.tab);
  const send = event.target.closest("[data-send]");
  if (send) {
    const [action, level] = send.dataset.send.split(":");
    vscode.postMessage({ type: "sendPrompt", action, level });
  }
});
document.querySelector("#selectContext").addEventListener("click", () => vscode.postMessage({ type: "selectContext" }));
document.querySelector("#savePrompt").addEventListener("click", () => vscode.postMessage({ type: "savePrompt" }));
document.querySelector("#savePromptFromPreview").addEventListener("click", () => vscode.postMessage({ type: "savePrompt" }));
document.querySelector("#copyPreview").addEventListener("click", () => vscode.postMessage({ type: "copyPreview" }));
document.querySelector("#scopeToggle").addEventListener("click", () => {
  state.scopeExpanded = !state.scopeExpanded;
  sync();
});
document.querySelector("#clearPrompt").addEventListener("click", () => {
  state.title = "";
  state.createDocument = false;
  state.command = "";
  state.location = state.settings.fileLocation || "";
  state.prompt = "";
  state.contextItems = [];
  sync();
});
document.querySelector("#saveSettings").addEventListener("click", sync);
document.querySelector("#resetSettings").addEventListener("click", () => vscode.postMessage({ type: "reset" }));
document.body.addEventListener("input", readInputs);
document.body.addEventListener("change", readInputs);
function setTab(tabName) {
  state.activeTab = tabName;
  sync();
}
function readInputs(event) {
  if (!state || event.target.id === "scopeToggle") return;
  const field = event.target.dataset.field;
  const setting = event.target.dataset.setting;
  if (field) {
    state[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  }
  if (field === "createDocument" && state.createDocument && !state.location) {
    state.location = state.settings.fileLocation || "";
  }
  if (setting) {
    state.settings[setting] = event.target.type === "number" ? Number(event.target.value) : event.target.value;
  }
  if (event.target.dataset.outputTarget) {
    state.settings.outputTarget = event.target.dataset.outputTarget;
  }
  const scopeKey = event.target.dataset.scope;
  if (scopeKey) state.scope[scopeKey] = event.target.checked;
  const settingCheck = event.target.dataset.settingCheck;
  if (settingCheck) state.settings[settingCheck] = event.target.checked;
  sync();
}
function sync() {
  vscode.postMessage({ type: "updateState", state });
}
function render() {
  if (!state) return;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.activeTab));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === state.activeTab));
  setValue("#title", state.title);
  document.querySelector("#createDocument").checked = Boolean(state.createDocument);
  setValue("#location", state.location);
  setValue("#verbosity", state.verbosity);
  setValue("#promptText", state.prompt);
  renderOptions("#command", initialCommands, state.command);
  syncDocumentControls();
  renderContext();
  renderScope();
  document.querySelector("#previewText").textContent = preview || "";
  renderSaved();
  setValue("#saveLocation", state.settings.saveLocation);
  setValue("#fileLocation", state.settings.fileLocation);
  setValue("#promptFooter", state.settings.promptFooter);
  setValue("#copilotRoute", state.settings.copilotRoute);
  setValue("#copilotChatMode", state.settings.copilotChatMode);
  setValue("#outputFormat", state.settings.outputFormat);
  setValue("#defaultVerbosity", state.settings.defaultVerbosity);
  document.querySelectorAll("[data-output-target]").forEach((input) => input.checked = input.dataset.outputTarget === state.settings.outputTarget);
  renderOptions("#simpleAgent", agents, state.settings.simpleAgent);
  renderOptions("#normalAgent", agents, state.settings.normalAgent);
  renderOptions("#thinkingAgent", agents, state.settings.thinkingAgent);
  setValue("#maxFileReads", state.settings.maxFileReads);
  setValue("#maxFilesChanged", state.settings.maxFilesChanged);
  renderSettingsChecks();
}
function renderOptions(selector, options, selected) {
  const select = document.querySelector(selector);
  select.innerHTML = "";
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.append(el);
  }
  select.value = selected;
}
function syncDocumentControls() {
  const enabled = Boolean(state.createDocument);
  document.querySelector("#command").disabled = !enabled;
  document.querySelector("#location").disabled = !enabled;
}
function renderContext() {
  const list = document.querySelector("#contextList");
  list.innerHTML = "";
  if (!state.contextItems.length) {
    list.innerHTML = "<div class='muted'>No context selected</div>";
    return;
  }
  for (const item of state.contextItems) {
    const row = document.createElement("div");
    row.className = "context-item";
    row.innerHTML = "<span title='" + escapeAttr(item.path) + "'>" + escapeHtml(item.label) + "</span>";
    const button = document.createElement("button");
    button.className = "secondary";
    button.textContent = "X";
    button.addEventListener("click", () => vscode.postMessage({ type: "removeContext", id: item.id }));
    row.append(button);
    list.append(row);
  }
}
function renderScope() {
  const body = document.querySelector("#scopeBody");
  body.classList.toggle("open", state.scopeExpanded);
  document.querySelector("#scopeToggle").textContent = state.scopeExpanded ? "Scope ^" : "Scope v";
  body.innerHTML = "";
  for (const [key, label] of scopeChecks) {
    body.append(check(key, label, state.scope[key], "scope"));
  }
}
function renderSettingsChecks() {
  const body = document.querySelector("#settingsChecks");
  body.innerHTML = "";
  for (const [key, label] of settingsChecks) {
    body.append(check(key, label, state.settings[key], "settingCheck"));
  }
}
function renderSaved() {
  const list = document.querySelector("#savedList");
  list.innerHTML = "";
  if (!savedPrompts.length) {
    list.innerHTML = "<div class='muted'>No saved prompts</div>";
    return;
  }
  for (const prompt of savedPrompts) {
    const row = document.createElement("div");
    row.className = "saved-item";
    const open = document.createElement("button");
    open.className = "link";
    open.textContent = prompt.title;
    open.title = prompt.path;
    open.addEventListener("click", () => vscode.postMessage({ type: "openSavedPrompt", path: prompt.path }));
    const meta = document.createElement("span");
    meta.className = "muted";
    meta.textContent = prompt.updatedAt;
    row.append(open, meta);
    list.append(row);
  }
}
function check(key, label, checked, datasetName) {
  const labelEl = document.createElement("label");
  labelEl.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.dataset[datasetName] = key;
  labelEl.append(input, document.createTextNode(label));
  return labelEl;
}
function setValue(selector, value) {
  const el = document.querySelector(selector);
  if (el && el.value !== String(value ?? "")) {
    el.value = value ?? "";
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
  }
}

function collectUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  if (uris?.length) {
    return uris;
  }
  return uri ? [uri] : [];
}

function firstWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

function verbosityInstruction(verbosity: Verbosity): string {
  switch (verbosity) {
    case "Detailed":
      return "Use detailed verbosity. Include important reasoning and tradeoffs.";
    case "Normal":
      return "Use normal verbosity. Include the decisions that matter.";
    case "Brief":
    default:
      return "Use brief verbosity. Make the smallest useful response.";
  }
}

function scopeInstructions(scope: ScopeState): string[] {
  const lines: string[] = [];
  if (scope.useTools) lines.push("Use tools only for the requested task.");
  if (scope.readRepoContext) lines.push("Read repository context only where it is directly relevant.");
  if (scope.searchRepo) lines.push("Search the repository for directly relevant files or symbols.");
  if (scope.askBeforeChanges) lines.push("Ask before making broad or cross-cutting changes.");
  if (scope.writeCode) lines.push("Write code for the requested change.");
  if (scope.writeDocs) lines.push("Write documentation for the requested output.");
  if (scope.runTests) lines.push("Run focused tests that directly verify the change.");
  if (scope.webLookup) lines.push("Use web lookup for current or external information.");
  if (scope.existingContext) lines.push("Use only the context provided unless more information is required.");
  return lines;
}

function settingsInstructions(settings: PrompterSettings): string[] {
  const lines: string[] = [];
  if (settings.maxFileReads >= 0) lines.push(`Read at most ${settings.maxFileReads} file(s) unless I approve more.`);
  if (settings.maxFilesChanged >= 0) lines.push(`Change at most ${settings.maxFilesChanged} file(s) unless I approve more.`);
  if (settings.confirmBroadSearch) lines.push("Confirm before broad repository search.");
  if (settings.confirmPackageInstall) lines.push("Confirm before installing packages.");
  if (settings.confirmToolUse) lines.push("Confirm before using tools.");
  if (settings.confirmFileEdits) lines.push("Confirm before editing files.");
  if (settings.allowBroadRepoSearch) lines.push("Broad repository search is allowed when directly useful.");
  if (settings.allowWebLookup) lines.push("Web lookup is allowed when current or external information is needed.");
  if (settings.allowPackageInstall) lines.push("Package installation is allowed when needed.");
  if (settings.allowTests) lines.push("Tests are allowed when focused on the requested task.");
  if (settings.stopAfterPlan) lines.push("Stop after producing the plan.");
  if (settings.preferExistingContext) lines.push("Prefer existing context.");
  if (settings.outputFormat !== "Markdown") lines.push(`Use ${settings.outputFormat} output format.`);
  if (settings.includeChecklist) lines.push("Include a checklist.");
  return lines;
}

function sanitizeRelativeDirectory(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = normalized.split("/").filter((part) => part && part !== "." && part !== "..");
  return parts.length ? parts.join("/") : ".my/prompts";
}

function timestampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "prompt";
}

function levelLabel(level: SendLevel): string {
  return level === "thinking" ? "Thinking" : `${level.charAt(0).toUpperCase()}${level.slice(1)}`;
}

function effortForLevel(level: SendLevel, settings: PrompterSettings): "low" | "medium" | "high" {
  const agent = level === "simple"
    ? settings.simpleAgent
    : level === "normal"
      ? settings.normalAgent
      : settings.thinkingAgent;

  if (/high|thinking|opus/i.test(agent)) {
    return "high";
  }
  if (/medium|normal|balanced|sonnet/i.test(agent)) {
    return "medium";
  }
  return "low";
}

function verbosityForPrompt(verbosity: Verbosity): "low" | "medium" | "high" {
  if (verbosity === "Detailed") {
    return "high";
  }
  if (verbosity === "Normal") {
    return "medium";
  }
  return "low";
}

async function selectCopilotModel(
  level: SendLevel,
  settings: PrompterSettings,
  context: vscode.ExtensionContext
): Promise<vscode.LanguageModelChat | undefined> {
  await activateCopilotExtension();

  const vendorMatches = await vscode.lm.selectChatModels({ vendor: "copilot" });
  const fallbackMatches = vendorMatches.length
    ? []
    : (await vscode.lm.selectChatModels()).filter(isCopilotModel);
  const uniqueModels = new Map<string, vscode.LanguageModelChat>();
  for (const model of [...vendorMatches, ...fallbackMatches]) {
    uniqueModels.set(`${model.vendor}:${model.id}`, model);
  }

  const usableModels = [...uniqueModels.values()].filter((model) => {
    return context.languageModelAccessInformation.canSendRequest(model) !== false;
  });
  if (!usableModels.length) {
    return undefined;
  }

  return usableModels
    .sort((left, right) => scoreCopilotModel(right, level, settings) - scoreCopilotModel(left, level, settings))[0];
}

async function activateCopilotExtension(): Promise<void> {
  const extension = vscode.extensions.getExtension("github.copilot-chat")
    ?? vscode.extensions.getExtension("GitHub.copilot-chat")
    ?? vscode.extensions.getExtension("GitHub.copilot")
    ?? vscode.extensions.all.find((item) => item.id.toLowerCase() === "github.copilot-chat");

  if (extension && !extension.isActive) {
    try {
      await extension.activate();
    } catch {
      // Selecting the language model below will still trigger the provider activation event when available.
    }
  }
}

async function openCopilotChatWithPrompt(prompt: string, mode: CopilotChatMode, submit: boolean): Promise<boolean> {
  await activateCopilotExtension();
  try {
    await vscode.commands.executeCommand("workbench.action.chat.open", {
      query: prompt,
      isPartialQuery: !submit,
      mode
    });
    return true;
  } catch {
    try {
      await vscode.commands.executeCommand("workbench.panel.chat.view.copilot.focus");
    } catch {
      // The caller can fall back to the clipboard.
    }
    return false;
  }
}

function isCopilotModel(model: vscode.LanguageModelChat): boolean {
  const text = modelSearchText(model);
  return text.includes("copilot") || text.includes("github");
}

function scoreCopilotModel(model: vscode.LanguageModelChat, level: SendLevel, settings: PrompterSettings): number {
  const text = modelSearchText(model);
  const agent = agentForLevel(level, settings).toLowerCase();
  let score = model.vendor.toLowerCase() === "copilot" ? 4 : 0;

  if (/haiku|mini|nano|small|fast|low/.test(agent)) {
    score += /haiku|mini|nano|small|fast|3\.5|low/.test(text) ? 12 : 0;
    score -= /opus|thinking|reason|high/.test(text) ? 5 : 0;
  }

  if (/sonnet|balanced|medium|normal/.test(agent)) {
    score += /sonnet|balanced|medium|gpt-4|gpt4|4o/.test(text) ? 12 : 0;
    score -= /nano|small/.test(text) ? 2 : 0;
  }

  if (/opus|thinking|reason|high/.test(agent)) {
    score += /opus|thinking|reason|high|o3|o4|gpt-5|gpt5/.test(text) ? 12 : 0;
    score += Math.min(model.maxInputTokens, 200_000) / 100_000;
  }

  if (level === "simple") {
    score += /mini|nano|small|fast|haiku|low/.test(text) ? 8 : 0;
  } else if (level === "normal") {
    score += /sonnet|balanced|medium|gpt-4|gpt4|4o/.test(text) ? 8 : 0;
  } else {
    score += /opus|thinking|reason|high|o3|o4|gpt-5|gpt5/.test(text) ? 8 : 0;
    score += Math.min(model.maxInputTokens, 200_000) / 100_000;
  }

  return score;
}

function agentForLevel(level: SendLevel, settings: PrompterSettings): string {
  if (level === "simple") {
    return settings.simpleAgent;
  }
  if (level === "normal") {
    return settings.normalAgent;
  }
  return settings.thinkingAgent;
}

function modelSearchText(model: vscode.LanguageModelChat): string {
  return [model.name, model.id, model.vendor, model.family, model.version].join(" ").toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function findCodexExecutable(): string {
  const configured = vscode.workspace.getConfiguration("chatgpt").get<string | null>("cliExecutable");
  if (configured) {
    return configured;
  }

  const codexExtension = vscode.extensions.getExtension("openai.chatgpt");
  if (!codexExtension) {
    return "codex";
  }

  const platformDir = process.platform === "win32"
    ? "windows-x86_64"
    : process.platform === "darwin"
      ? process.arch === "arm64" ? "macos-aarch64" : "macos-x86_64"
      : process.arch === "arm64" ? "linux-aarch64" : "linux-x86_64";
  const binary = process.platform === "win32" ? "codex.exe" : "codex";
  return path.join(codexExtension.extensionPath, "bin", platformDir, binary);
}

function buildCodexTerminalCommand(args: {
  action: SendAction;
  codexExecutable: string;
  cwd: string;
  effort: "low" | "medium" | "high";
  promptPath: string;
  sandbox: "read-only" | "workspace-write";
  verbosity: "low" | "medium" | "high";
}): string {
  if (process.platform === "win32") {
    const command = args.action === "add"
      ? [
          "resume",
          "--last",
          "-C", "$cwd",
          "-s", args.sandbox,
          "-a", "on-request",
          "-c", psQuote(`model_reasoning_effort="${args.effort}"`),
          "-c", psQuote(`model_verbosity="${args.verbosity}"`),
          "--no-alt-screen",
          "$prompt"
        ]
      : [
          "-C", "$cwd",
          "-s", args.sandbox,
          "-a", "on-request",
          "-c", psQuote(`model_reasoning_effort="${args.effort}"`),
          "-c", psQuote(`model_verbosity="${args.verbosity}"`),
          "--no-alt-screen",
          "$prompt"
        ];

    return [
      `$prompt = Get-Content -Raw -LiteralPath ${psQuote(args.promptPath)}`,
      `$cwd = ${psQuote(args.cwd)}`,
      `& ${psQuote(args.codexExecutable)} ${command.join(" ")}`
    ].join("; ");
  }

  const command = args.action === "add"
    ? [
        "resume",
        "--last",
        "-C", shQuote(args.cwd),
        "-s", args.sandbox,
        "-a", "on-request",
        "-c", shQuote(`model_reasoning_effort="${args.effort}"`),
        "-c", shQuote(`model_verbosity="${args.verbosity}"`),
        "--no-alt-screen",
        "\"$prompt\""
      ]
    : [
        "-C", shQuote(args.cwd),
        "-s", args.sandbox,
        "-a", "on-request",
        "-c", shQuote(`model_reasoning_effort="${args.effort}"`),
        "-c", shQuote(`model_verbosity="${args.verbosity}"`),
        "--no-alt-screen",
        "\"$prompt\""
      ];

  return `prompt=$(cat ${shQuote(args.promptPath)}); ${shQuote(args.codexExecutable)} ${command.join(" ")}`;
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function shQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function selectedInitialCommand(value: string): InitialCommand | undefined {
  return initialCommands.find((item) => item.value === value && item.value);
}

function mergeState(base: PrompterState, patch?: Partial<PrompterState>): PrompterState {
  if (!patch) {
    return base;
  }
  const merged = {
    ...base,
    ...patch,
    scope: { ...base.scope, ...(patch.scope ?? {}) },
    settings: { ...base.settings, ...(patch.settings ?? {}) },
    contextItems: patch.contextItems ?? base.contextItems
  };

  if (patch.createDocument === undefined && patch.command !== undefined) {
    merged.createDocument = patch.command !== "";
  }

  return merged;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
