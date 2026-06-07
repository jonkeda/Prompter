You are helping me produce high‑quality DESIGN DOCUMENTATION for a VS Code extension called “Prompt Composer”.

IMPORTANT:

- Focus ONLY on design, architecture, UX, flows, and decisions.
- Do NOT generate code.
- Do NOT propose implementation details unless they are conceptual.
- Think like a senior product designer + senior architect.

---

## GOAL

Create a complete design document for a VS Code extension that lets users build prompts using GUI controls such as sliders, checkboxes, dropdowns, and text fields. The extension should generate a final prompt preview based on user-selected options.

---

## REQUIRED SECTIONS

Include the following sections in the design doc:

### 1. Product Overview

Explain what the extension does, who it is for, and what problem it solves.

### 2. User Personas

Describe the types of users (e.g., developers, prompt engineers, beginners).

### 3. Core Features

List and describe the main features, including:

- Verbosity controls
- Reasoning depth controls
- Tone/style selection
- Output format selection
- Agent/tool usage toggles
- Context inclusion toggles
- Task-type presets
- Extra constraints
- Live prompt preview
- Prompt saving & loading

### 4. UX & UI Design

Describe:

- The layout of the Webview panel
- How controls are grouped
- How the preview updates
- How users save/load presets
- How users send the prompt to Copilot Chat

### 5. Information Architecture

Describe:

- Data model for prompt configuration
- How presets are stored (workspace vs global)
- How the UI maps to the configuration schema

### 6. User Flows

Describe step-by-step flows for:

- Creating a prompt
- Editing a prompt
- Saving a preset
- Loading a preset
- Sending prompt to Copilot Chat

### 7. Prompt Generation Logic

Describe the conceptual algorithm that:

- Reads the user’s selections
- Maps them to textual directives
- Assembles the final prompt
- Ensures clarity and consistency

### 8. Constraints & Boundaries

Describe:

- What the extension should NOT do
- How to avoid over-complexity
- How to keep the UX simple

### 9. Future Enhancements

Describe possible future features such as:

- Multi-step prompt workflows
- AI-assisted preset suggestions
- Workspace-aware prompt templates
- Team-shared prompt libraries

---

## STYLE REQUIREMENTS

- Write in clear, structured, professional language.
- Use headings, subheadings, and bullet lists.
- Keep explanations conceptual, not technical.
- Avoid implementation details and code.
- Provide rationale for design decisions.

---

## OUTPUT FORMAT

Return the design document in Markdown.
