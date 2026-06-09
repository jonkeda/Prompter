# Repository Layout

Prompter is split by host editor so each extension can use the platform APIs and packaging model that fit that editor.

## Structure

- `extensions/vscode`: VS Code extension package, TypeScript source, webview assets, and VS Code manifest.
- `extensions/visualstudio`: Visual Studio VSIX solution and project.
- `shared/prompter-contract`: shared prompt metadata and behavior notes for keeping both extensions aligned.
- `.vscode`: workspace-level debug tasks that launch the VS Code extension from its new folder.

## Guidelines

- Keep host-specific UI and API calls inside the matching extension folder.
- Put editor-neutral prompt shape, metadata conventions, and persistence rules under `shared/prompter-contract`.
- Avoid coupling the Visual Studio extension to VS Code-specific webview state. Port behavior through the shared contract instead.
