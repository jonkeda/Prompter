# Prompter Core Features Design

## Goal

Prompter should let a user compose, preview, save, and send controlled prompts to agent chat tools such as Copilot Chat and Codex. The main purpose is to keep agent-mode usage intentional, bounded, and cheaper by default.

The product should make it easy to choose the right effort level before sending:

- `Simple`: fast, cheap, narrow task
- `Normal`: balanced model for most work
- `Thinking`: expensive model only for genuinely hard work

Prompter should encourage focused context use. Broad repository context should be an explicit user choice.

## Core User Flow

1. Open Prompter.
2. Land on the `Prompt` tab.
3. Pick an optional initial command.
4. Choose verbosity.
5. Enter the target location for generated files when relevant.
6. Enter the custom prompt text in a large text box.
7. Select optional context files or folders.
8. Send the prompt as a new chat or add it to an existing chat using the configured agents.
10. Open the `Preview` tab to inspect the final generated prompt.
11. Open the `Settings` tab only when less common options are needed.
12. Save the prompt to `.my/prompts`.

## Navigation

Prompter uses three top-level tabs:

1. `Prompt`
2. `Preview`
3. `Settings`

The `Prompt` tab is always first and selected by default.

## Prompt Tab

The `Prompt` tab contains the controls used most often:

- `Title`
- `Initial command` combo box
- `Location` input
- `Verbosity` dropdown
- cost and scope expander
- selected context list
- `Prompt` text box
- send button grid
- `Save` action
- `Clear` action

The prompt text box should be the largest element on the screen. It is where the user enters the prompt they want to save or preview.

## Context Selection

The `Prompt` tab should include a `Select context` button and a compact list viewer.

The context list should show files, folders, or selected text ranges the user deliberately added. This gives the user explicit control over what context the agent sees.

Each context item should show:

- file name or folder name
- relative path
- type: file, folder, or selection
- remove action

The first version should store selected context as references, not copied file contents. The composed prompt can mention those references explicitly.

Example composed context text:

```text
Use this selected context only:
- 01_design.md
- 02_screen_designs.md
```

Context selection should work from two places:

1. `Select context` button in the Prompt tab.
2. File Explorer context menu commands.

## File Explorer Commands

Prompter should add commands to the VS Code File Explorer context menu.

Recommended commands:

| Command | Purpose |
| --- | --- |
| `Prompter: Add file to prompt` | Adds the selected file or folder to Prompter's selected context list. |
| `Prompter: Add file to chat` | Sends or stages the selected file or folder as context for the configured chat target. |

For Codex output, the extension can map `Add file to chat` to documented Codex IDE commands where available, such as `chatgpt.addFileToThread` for adding an entire file to the current thread. When the active output is Copilot, the extension should use an available Copilot integration if one exists; otherwise it should add the file to the Prompter context list and include it in the staged prompt.

## Initial Command Combo Box

The combo box label should be `Initial command`.

The option text can use this pattern:

`Create a file for: <type>`

Initial command options:

- `<none>`
- `RCA`
- `Roadmap`
- `Issue`
- `Design`
- `Decision record`
- `Test plan`
- `Release notes`

Each option maps to a short command prefix:

| Option | Command text |
| --- | --- |
| `<none>` | Empty command prefix. |
| RCA | `Create a file for an RCA.` |
| Roadmap | `Create a file for a roadmap.` |
| Issue | `Create a file for an issue.` |
| Design | `Create a file for a design.` |
| Decision record | `Create a file for a decision record.` |
| Test plan | `Create a file for a test plan.` |
| Release notes | `Create a file for release notes.` |

The final prompt is composed from:

1. Selected command text
2. Location instruction when present
3. Selected context references
4. Verbosity and scope controls
5. User-entered prompt text
6. Optional settings text

Example:

```text
Create a file for a roadmap.
Put the file under .my/plan.
Use selected context only:
- 01_design.md
Use brief verbosity.
Use provided context first.
Ask before broad or cross-cutting changes.
Write documentation for the requested output.

Add milestones for the first version of the Prompter app.
```

## Location Input

The `Location` input tells the agent where created files should go.

Example values:

- `.my/plan`
- `.my/prompts`
- `docs/design`
- `issues`

When the field is set, the composed prompt should include a direct instruction:

```text
Put the created file under .my/plan.
```

The field should not force validation against the real file system in the first version. It is an instruction to the agent, not a file picker.

## Verbosity

The `Prompt` tab should include a `Verbosity` dropdown:

- `Brief`
- `Normal`
- `Detailed`

Verbosity controls answer length and explanation depth. It is separate from the send levels:

- `Simple`, `Normal`, and `Thinking` choose the agent/model effort.
- `Brief`, `Normal`, and `Detailed` choose how much the agent says.

Suggested behavior:

| Verbosity | Prompt instruction |
| --- | --- |
| Brief | `Use brief verbosity. Make the smallest useful response.` |
| Normal | `Use normal verbosity. Include the decisions that matter.` |
| Detailed | `Use detailed verbosity. Include important reasoning and tradeoffs.` |

## Cost And Scope Expander

The `Prompt` tab should include a `Scope` expander with positive capability checkboxes for common cost and scope choices.

Recommended defaults:

| Checkbox | Default | Prompt instruction when enabled |
| --- | --- | --- |
| Use agent tools | Off | `Use tools only for the requested task.` |
| Read repository context | Off | `Read repository context only where it is directly relevant.` |
| Search repository | Off | `Search the repository for directly relevant files or symbols.` |
| Ask before broad changes | On | `Ask before making broad or cross-cutting changes.` |
| Write code | Off | `Write code for the requested change.` |
| Write documentation | On | `Write documentation for the requested output.` |
| Run tests | Off | `Run focused tests that directly verify the change.` |
| Use web lookup | Off | `Use web lookup for current or external information.` |
| Prefer existing context | On | `Use only the context provided unless more information is required.` |

The most important default is that repository reading and repository search are off. Prompter exists to prevent costly uncontrolled agent sessions, so broader context gathering should be opt-in.

## Agent Selection

Prompter should support sending prompts to these primary output targets:

- Copilot Chat
- Codex

Claude Chat can remain a later or custom target if a reliable integration path is available, but the first design should focus on Copilot and Codex because those match the extension-sidebar workflow.

The `Settings` tab should have three agent selection dropdowns:

1. `Simple agent`
2. `Normal agent`
3. `Thinking agent`

Each dropdown selects the destination and model preset for that level.

Example presets:

| Dropdown | Example selected agent |
| --- | --- |
| Simple agent | Codex low |
| Normal agent | Codex medium |
| Thinking agent | Codex high |

Copilot presets can also appear in these dropdowns, depending on what the extension can invoke:

- Copilot fast
- Copilot balanced
- Copilot thinking

If Claude is added later, the same three-level mapping can use Claude Haiku, Claude Sonnet, and Claude Opus. The first version can treat these as named routing targets. The implementation detail of opening the target chat can be handled later per editor capability.

## Send Button Grid

The send area has two rows and three columns.

Rows:

1. `New`
2. `Add`

Columns:

1. `Simple`
2. `Normal`
3. `Thinking`

Button grid:

|  | Simple | Normal | Thinking |
| --- | --- | --- | --- |
| New | `New Simple` | `New Normal` | `New Thinking` |
| Add | `Add Simple` | `Add Normal` | `Add Thinking` |

Behavior:

- `New` sends the composed prompt to a new chat.
- `Add` sends the composed prompt to the current or selected existing chat.
- `Simple` uses the selected `Simple agent`.
- `Normal` uses the selected `Normal agent`.
- `Thinking` uses the selected `Thinking agent`.

The button labels can be short in the UI, but tooltips should name the full action:

- `Start new chat with Simple agent`
- `Add to current chat with Normal agent`
- `Start new chat with Thinking agent`

## Preview Tab

The `Preview` tab shows the final generated prompt.

The preview should update from:

- selected initial command
- location
- selected context
- verbosity
- cost and scope checkboxes
- prompt text
- less common settings

The preview can also include a `Copy` action.

## Settings Tab

Less common settings belong behind the `Settings` tab.

Suggested initial settings:

- `Output format`: Markdown, plain text, JSON outline, checklist
- `Output target`: Copilot or Codex
- `Default verbosity`: brief, normal, detailed
- `Audience`: optional text field
- `Include checklist`: checkbox
- `Include metadata`: checkbox
- `Max file reads`: numeric input
- `Max files changed`: numeric input
- `Require confirmation before tool use`: checkbox
- `Require confirmation before file edits`: checkbox
- `Allow tests`: checkbox
- `Allow package install`: checkbox
- `Allow web lookup`: checkbox
- `Allow broad repo search`: checkbox
- `Default save location`: text input
- `Prompt footer`: reusable text appended to every prompt
- `Simple agent`: dropdown
- `Normal agent`: dropdown
- `Thinking agent`: dropdown

Settings should only add text to the prompt when they are useful or differ from defaults.

## Useful Settings For Cost Control

Because Prompter is meant to control agent-mode cost, settings should focus on hard boundaries.

Recommended cost controls:

| Setting | Purpose |
| --- | --- |
| Max file reads | Prevent exploratory repo scanning. |
| Max files changed | Keep implementation attempts small. |
| Output target | Choose whether send actions target Copilot or Codex. |
| Default verbosity | Control explanation length without duplicating send level. |
| Require confirmation before tool use | Keeps tool-heavy sessions intentional. |
| Require confirmation before file edits | Separates planning from implementation. |
| Allow broad repo search | Makes expensive context gathering explicit. |
| Allow web lookup | Prevents unnecessary external research. |
| Allow package install | Prevents accidental dependency churn. |
| Stop after plan | Useful when the user wants design first. |

Recommended default values:

| Setting | Default |
| --- | --- |
| Max file reads | `3` |
| Max files changed | `2` |
| Output target | `Codex` |
| Default verbosity | `Brief` |
| Require confirmation before broad repo search | `On` |
| Require confirmation before package install | `On` |
| Allow broad repo search | `Off` |
| Allow web lookup | `Off` |
| Stop after plan | `Off` |

## Storage

Saved prompts are stored under:

```text
.my/prompts
```

Each saved prompt should be a Markdown file.

Recommended file naming:

```text
YYYY-MM-DDTHH-mm-ss-sssZ-title-slug.md
```

Example:

```text
.my/prompts/2026-06-06T12-45-30-000Z-roadmap.md
```

## Saved Prompt Format

Recommended Markdown format:

```markdown
---
title: "Roadmap"
command: "roadmap"
commandLabel: "Roadmap"
createdAt: "2026-06-06T12:45:30.000Z"
updatedAt: "2026-06-06T12:45:30.000Z"
outputFormat: "Markdown"
outputTarget: "Codex"
verbosity: "Brief"
audience: ""
location: ".my/plan"
context:
  - "01_design.md"
includeChecklist: false
---

# Roadmap

Command: Roadmap

## Prompt

Create a file for a roadmap.

Add milestones for the first version of the Prompter app.
```

## Save Behavior

On save:

1. Ensure `.my/prompts` exists.
2. Compose the final prompt from command, location, selected context, verbosity, scope controls, prompt text, and settings.
3. Write a new Markdown file.
4. Refresh the saved prompt list.
5. Show the saved path.

The first version can always create a new file. Editing existing saved prompts can be added later.

## Saved Prompt List

The app should show a saved prompt list near the composer.

Each item should show:

- title
- command label when present
- last updated date
- file name or relative path

Selecting a saved prompt should open it in the preview tab first. Full edit-in-place behavior can come later.

## Implementation Notes

A real editor extension can write prompts into `.my/prompts` through the editor extension host and workspace file APIs. The UI can be a webview, but file writes should be performed by the extension layer rather than browser-only JavaScript.

Recommended first implementation:

- VS Code extension
- webview UI for the three tabs
- extension commands for save, read, and send actions
- File Explorer context menu commands for adding context
- workspace file APIs for `.my/prompts`

Suggested extension actions:

| Action | Purpose |
| --- | --- |
| `listCommands` | List standard commands |
| `listAgents` | List configured agent routing presets |
| `selectContext` | Select files, folders, or ranges for prompt context |
| `addExplorerItemToPrompt` | Add selected Explorer file or folder to the context list |
| `addExplorerItemToChat` | Send or stage selected Explorer file or folder for the active chat target |
| `listPrompts` | List saved prompts |
| `readPrompt` | Read one saved prompt |
| `savePrompt` | Save a new prompt under `.my/prompts` |
| `sendPrompt` | Send or stage a prompt for the selected chat target |

Direct sending to Copilot Chat depends on what the Copilot extension exposes. If direct Copilot automation is unavailable, the first version should still compose the correct prompt and support copy, clipboard staging, or opening the target chat.

For Codex output, current Codex documentation describes several integration options:

- [Codex IDE extension commands](https://developers.openai.com/codex/ide/commands), including `chatgpt.addFileToThread` and `chatgpt.newChat`.
- [Codex app-server](https://developers.openai.com/codex/app-server) for deep local integration with threads, turns, approvals, and streamed events.
- [Codex SDKs](https://developers.openai.com/codex/sdk) for TypeScript and Python.
- [`codex exec`](https://developers.openai.com/codex/noninteractive) for non-interactive scripted runs.

The first version should prefer the lightest reliable Codex path:

1. Use documented IDE commands when they cover the action.
2. Use app-server or SDK integration only when the extension needs full conversation control.
3. Fall back to copy/stage behavior if the user's installed Codex surface does not expose the needed command.

## First Implementation Slice

1. Create `.my/prompts` if missing.
2. Build the three-tab UI.
3. Add the initial command combo box with `<none>`.
4. Add the location input.
5. Add the verbosity dropdown.
6. Add the `Select context` button and context list viewer.
7. Add File Explorer context menu commands.
8. Add cost and scope checkboxes.
9. Add the prompt text box.
10. Add the three agent dropdowns in Settings.
11. Add the two-row send grid.
12. Add output target setting for Copilot or Codex.
13. Add preview composition.
14. Add save-to-Markdown behavior.
15. Add saved prompt listing.

## Later Enhancements

- Edit existing prompts.
- Delete saved prompts.
- Search saved prompts.
- Add custom initial commands.
- Add prompt templates per command type.
- Add import/export for `.my/prompts`.
- Add direct Copilot Chat integration.
- Add optional Claude Chat integration.
- Add usage estimates per send level.
- Add a session cost log.
- Add per-project cost-control profiles.
