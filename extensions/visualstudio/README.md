# Prompter for Visual Studio

This folder contains the Visual Studio extension project for Prompter.

## Project

- `Prompter.VisualStudio/Prompter.VisualStudio.csproj` builds the VSIX package.
- `Prompter.VisualStudio/source.extension.vsixmanifest` declares the Visual Studio extension identity and installation target.
- `Prompter.VisualStudio/PrompterPackage.cs` registers the package, menu command, and tool window.

## Build

From the repository root:

```powershell
npm run build:visualstudio
```

The project targets Visual Studio 2022 and newer through the VSIX manifest range `[17.0,19.0)`.
