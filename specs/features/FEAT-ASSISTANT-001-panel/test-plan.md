# Test Plan

## Test Scope

This plan covers the new shell-level assistant panel, its launch behavior, resize behavior, and integrated chat composer UX.

## Frontend Component And Integration Tests

### Header And Shell

- assistant trigger renders in the topbar for authenticated users
- assistant trigger toggles panel open/closed
- panel remains available across authenticated route changes

### Panel Layout

- panel opens on the right side of the content area
- panel close behavior restores content layout cleanly
- panel resize handle updates panel width within min/max limits
- width persistence works within the same browser session if implemented

### Chat Surface

- existing chat messages render inside the docked panel
- loading state renders while a query is in progress
- empty state renders appropriately before any conversation
- assistant answers with fenced `mermaid` blocks render diagrams inline inside the panel
- invalid Mermaid blocks show a graceful fallback instead of breaking the panel

### Composer

- composer uses the rounded integrated surface
- action icon renders inside the composer container
- textarea auto-grows vertically with longer input
- `Enter` / `Shift+Enter` behavior matches the intended submit vs multiline model
- composer stays usable when the panel is narrow

### Accessibility

- trigger has an accessible label
- close button has an accessible label
- focus can move into the panel and back out predictably

## Manual Validation

- panel interaction feels similar to a docked Copilot-style workspace
- panel resize feels smooth at normal laptop and desktop widths
- page content remains usable while the panel is open
- composer visually reads as one rounded control, not a loose textarea plus detached button

## Non-Goals For First Release Test Automation

- real AI model behavior
- backend contract expansion
- multi-conversation persistence
