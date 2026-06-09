# Prompter

Prompter is a local VS Code sidebar extension for composing bounded prompts, selecting explicit context, saving prompts under `.my/prompts`, and staging prompts for Codex or Copilot.

## First Slice

- Sidebar UI with Prompt, Preview, and Settings tabs.
- Prompt composition with command, location, context, verbosity, scope, and settings.
- Send controls include the Codex/Copilot target selector directly beside the Send label.
- Workspace prompt storage under `.my/prompts`.
- Explorer context menu commands for adding files to the prompt or chat context.
- Codex send actions launch the Codex CLI in an integrated terminal when available.
- Copilot send actions can use the Chat panel route or the model API route.
- The Chat panel route stages prompts in Copilot Chat with a selectable mode, defaulting to Agent mode without auto-submit.
- The model API route activates VS Code's bundled Copilot Chat provider, streams the answer to `Prompter Copilot`, and opens a markdown response document when a Copilot model is selectable.
