# Feature Specification

## Feature ID

- `FEAT-ASSISTANT-001`

## Feature Name

- `AI Assistant Panel`

## Summary

Introduce a shell-level AI assistant panel that is launched from the topbar and opens as a right-docked, horizontally resizable workspace similar to VS Code Copilot Chat.

## Functional Requirements

### FR-1 Header Trigger

- The authenticated shell must expose an AI assistant trigger in the top-right topbar action area.
- The trigger must visually align with existing topbar action patterns.
- The trigger must indicate whether the assistant panel is open or closed.

### FR-2 Docked Assistant Panel

- Triggering the assistant opens a docked panel on the right side of the main content area.
- The panel must be rendered as part of the authenticated shell layout, not as a floating modal dialog.
- The panel must be closable from the trigger and from a close control inside the panel.

### FR-3 Horizontal Resize

- The panel must provide a horizontal resize handle on the panel's inner edge.
- Users must be able to drag the handle to resize the panel width.
- The width must be constrained by defined min/default/max values.
- Width changes must update layout without breaking the main page content area.

### FR-4 Chat Surface

- The panel must host the AI chat experience.
- The panel must show message history and loading states.
- The panel must support submitting new prompts from the composer.
- The panel must support the same first-release chat capability as the existing dedicated chat route.
- The panel must render Mermaid diagrams inline when an assistant answer includes fenced `mermaid` code blocks in Markdown.
- Invalid Mermaid blocks must degrade gracefully without breaking the rest of the answer rendering.

### FR-5 Composer

- The composer must be placed at the bottom of the panel.
- The composer must use a rounded container surface instead of appearing as a plain text field.
- The composer action icon must appear inside the same rounded surface as the textarea.
- The textarea must grow vertically with content until a max height is reached.
- The composer must preserve multiline entry and explicit/keyboard submit behavior.

### FR-6 Shell Persistence

- The assistant panel should remain available across authenticated routes.
- Open/closed state and current width should be preserved during in-app navigation.
- Lightweight browser-session persistence is allowed for first release.

## Non-Functional Requirements

### NFR-1 Theme Compatibility

- The panel must follow the shared theme system.
- The panel must work in supported theme families and light/dark variants.

### NFR-2 Accessibility

- The trigger must have an accessible name.
- Focus management must remain predictable.
- The panel must be usable with keyboard navigation.
- Resize interaction must not make the panel inaccessible for keyboard users.

### NFR-3 Layout Stability

- Opening or closing the panel must not produce broken content overflow.
- The panel must not cause page-level action bars or headers to become unusable at supported desktop/laptop widths.

## Acceptance Criteria

1. Users can open the assistant panel from the topbar on authenticated pages.
2. The panel appears docked on the right side of the content area.
3. Users can resize the panel horizontally with drag interaction.
4. The chat composer uses a rounded integrated surface with the action icon inside the same composer box.
5. The textarea grows vertically as prompt length increases.
6. Message history and current prompt entry remain usable while the panel is open.
7. The panel behaves consistently across route navigation inside the authenticated shell.
8. The panel respects theme styling and accessible interaction basics.
9. Assistant answers that include fenced `mermaid` code blocks render those diagrams inline inside the docked panel.
10. Invalid Mermaid content does not crash the panel and leaves the surrounding answer readable.
