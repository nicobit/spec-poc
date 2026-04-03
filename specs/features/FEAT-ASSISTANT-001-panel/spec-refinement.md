# Spec Refinement

## Feature Classification

- Feature-like UX and shell-navigation enhancement
- Frontend-first
- Reuses existing chat capability in the initial release

## Working Assumptions

1. The first release reuses the current chat/query capability instead of introducing a new AI backend contract.
2. The assistant panel is a shell-level feature available from authenticated application pages.
3. The assistant panel is docked on the right side of the content area, not rendered as a center modal or bottom sheet.
4. The existing primary navigation sidebar remains intact; the assistant panel appears as a second docked surface to the right of the page content.
5. The first release does not need multi-conversation history, prompt library support, or model selection.
6. The first release does not replace the existing `/chat` route immediately; that route may remain as a fallback until the panel is accepted.

## Scope

### In Scope

- Header action icon to toggle the assistant panel
- Right-docked assistant panel
- Horizontal resize handle with drag interaction
- Shell-aware content layout behavior while the panel is open
- Embedded AI chat view inside the panel
- Rounded chat composer with embedded action icon
- Auto-growing textarea inside the composer
- Theme-safe and keyboard-accessible behavior

### Out Of Scope

- New LLM or chat backend contracts
- Voice input
- File upload
- Per-user saved panel presets beyond the basic remembered width/open state if implemented
- Replacing the existing chat data model
- Production push notifications or real-time collaborative chat

## UX Decisions

### Placement

- The assistant trigger belongs in the right-side action cluster of the topbar.
- The assistant panel opens from the right side of the application content region.
- The panel should visually behave like a docked workspace, similar to a code-editor side panel.

### Layout Behavior

- Opening the panel must not feel like a modal interruption.
- The panel width should be resizable horizontally by dragging a visible handle.
- The panel width should respect a minimum, default, and maximum size.
- The panel should not collapse the main page into an unusable width.
- The panel should close cleanly without leaving layout artifacts.

### Composer Behavior

- The message composer is a rounded surface, not a plain textarea border.
- The action icon belongs inside the same composer surface.
- The textarea grows vertically as needed up to a reasonable max height, then scrolls internally.
- The send/submit affordance should remain visually anchored within the composer.

### Accessibility

- Trigger button needs an accessible label.
- The resize handle must be keyboard-considerate even if drag is the primary interaction.
- Focus order must stay predictable when the panel opens and closes.
- The chat composer must preserve keyboard submission behavior and multiline entry behavior.

## Open Questions

1. Should the assistant panel remain open while the user navigates between routes in the authenticated shell?
   - Recommended: yes
2. Should the existing `/chat` route remain in first release?
   - Recommended: yes, until the panel proves sufficient
3. Should width/open state persist per browser session?
   - Recommended: yes, lightweight local persistence is acceptable

## Recommended First Release Direction

- Implement the panel as a shell-level layout feature in the authenticated app shell.
- Reuse the current chat feature UI/logic where practical, but reshape it to fit the new docked panel.
- Keep the dedicated `/chat` route temporarily.
- Treat this as a product-wide assistant surface, not a page-local widget.
