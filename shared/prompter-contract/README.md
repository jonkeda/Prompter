# Prompter Contract

This folder captures the editor-neutral behavior shared by the VS Code and Visual Studio extensions.

## Prompt Storage

Saved prompts are markdown files under `.my/prompts` in the active workspace or solution root when the host can identify one.

## Prompt Metadata

Prompt markdown should keep these front matter fields when available:

- `title`
- `createDocument`
- `command`
- `commandLabel`
- `createdAt`
- `updatedAt`
- `fileName`
- `outputFormat`
- `outputTarget`
- `copilotRoute`
- `copilotChatMode`
- `verbosity`
- `location`
- `context`
- `includeChecklist`

## Shared Behavior

- Compose bounded prompts from an optional document request, explicit context items, verbosity, scope constraints, and free-form user text.
- Prefer selected context before broad repository discovery.
- Save generated prompt files in a deterministic location so either editor extension can reopen them later.
- Keep platform-specific send targets separate: VS Code can use VS Code commands and language-model APIs, while Visual Studio should add equivalent integrations through Visual Studio services.
