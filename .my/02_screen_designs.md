# Prompter Sidebar Screen Designs

These wireframes target a narrow extension sidebar, roughly 250px wide. Controls stack vertically, labels stay short, and dense actions use compact button text.

## Prompt Tab

```markui
+--[[Prompt]]-[Preview]-[Settings]--+
| Prompter                         |
| .my/prompts                      |
+----------------------------------+
Title
<Roadmap controls_______>
Initial command
<Roadmap v>
Location
<.my/plan______________>
Context
[Select context]
v--- Selected ---------v
| 01_design.md     [X] |
| 02_screens.md    [X] |
v----------------------v
Verbosity
<Brief v>
[Scope ^]
[ ] Use tools
[ ] Read repo context
[ ] Search repo
[x] Ask before changes
[ ] Write code
[x] Write docs
[ ] Run tests
[ ] Web lookup
[x] Existing context
Prompt
<Add milestones for v1.__>
<Reduce agent cost._____>
<_______________________>
<_______________________>
Send
|     | Simple | Normal | Think |
|-----|--------|--------|-------|
| New | [Send] | [Send] | [Send]|
| Add | [Send] | [Send] | [Send]|
[Save] [Clear]
```

## Preview Tab

```markui
+--[Prompt]-[[Preview]]-[Settings]--+
| Prompter                         |
| .my/prompts                      |
+----------------------------------+
Preview
[Copy] [Save]
+--- Generated prompt --------+
| Create a roadmap file.      |
| Put it under .my/plan.      |
| Use selected context only:  |
| - 01_design.md             |
| - 02_screens.md            |
| Use brief verbosity.        |
| Use provided context first. |
| Ask before broad changes.   |
| Write documentation.        |
| Add milestones for v1.      |
| Reduce agent-mode cost.     |
+-----------------------------+
Send
|     | Simple | Normal | Think |
|-----|--------|--------|-------|
| New | [Send] | [Send] | [Send]|
| Add | [Send] | [Send] | [Send]|
Recent
v--- Saved prompts -----------v
| Roadmap controls            |
| .my/prompts/roadmap.md      |
| Design routing              |
| .my/prompts/design.md       |
v-----------------------------v
```

## Settings Tab

```markui
+--[Prompt]-[Preview]-[[Settings]]--+
| Prompter                         |
| .my/prompts                      |
+----------------------------------+
Defaults
Save location
<.my/prompts_________>
File location
<.my/plan____________>
Prompt footer
<Stay focused._______>
<Ask before scope.___>
Output
Target
(*) Codex
( ) Copilot
Format
<Markdown v>
Default verbosity
<Brief v>
Agents
Simple
<Codex low v>
Normal
<Codex medium v>
Thinking
<Codex high v>
[x] Include metadata
[ ] Include checklist
Scope limits
Max file reads
<3_____>
Max files changed
<2_____>
[x] Confirm broad search
[x] Confirm package install
[ ] Confirm tool use
[x] Confirm file edits
Capabilities
[ ] Broad repo search
[ ] Web lookup
[ ] Package install
[x] Tests
[ ] Stop after plan
[x] Existing context
[Save Settings]
[Reset Defaults]
```

## File Explorer Context Menu

```markui
                   +------------------+
                   | Prompter         |
                   | Add to prompt    |
                   | Add to chat      |
                   +------------------+
```

## Interaction Notes

- `Think` is the compact sidebar label for `Thinking`.
- Each `Send` button uses the row and column to determine action and effort level.
- Agent dropdowns live in `Settings` and control the send buttons.
- `Select context` opens a file/folder picker and updates the selected list.
- `Add to prompt` from Explorer adds the item to the selected context list.
- `Add to chat` sends or stages the item for the active output target.
- `Output` selects whether send actions target Codex or Copilot.
- The default posture is controlled and cheap: provided context first, broad search opt-in, brief verbosity.
