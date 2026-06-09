# Prompter

Prompter is now organized as a multi-extension workspace.

## Extensions

- `extensions/vscode` contains the existing VS Code sidebar extension.
- `extensions/visualstudio` contains a separate Visual Studio VSIX scaffold.
- `shared/prompter-contract` documents the editor-neutral prompt contract both extensions should share.

## Build

Install Node dependencies from the repository root:

```powershell
npm install
```

Build the VS Code extension:

```powershell
npm run build:vscode
```

Build the Visual Studio extension:

```powershell
npm run build:visualstudio
```

The Visual Studio project requires the Visual Studio extension development workload.
