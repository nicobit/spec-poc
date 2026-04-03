# Business Request

## Request

Add an AI assistant entry point in the application header, on the right side, that opens a right-side panel similar to the AI Chat experience in VS Code Copilot.

## Desired User Experience

- A visible assistant icon is available in the top-right header action area.
- Clicking the icon opens a docked panel on the right side of the main content area.
- The panel feels like a persistent assistant workspace, not a temporary modal.
- The panel can be resized horizontally with drag-and-drop, similar to editor side panels.
- The panel contains an AI chat experience with:
  - message history
  - a bottom composer area
  - a textarea that grows vertically as the user types more text
  - a rounded input surface where the send/action icon is visually embedded in the same composer box

## Business Goal

Provide a fast, always-available AI assistant experience inside the admin portal without forcing users to navigate away to the current standalone chat page.

## Why Now

- The portal already contains chat capabilities, but they are isolated in a dedicated route.
- Users should be able to access assistance from anywhere in the product.
- The shell-level entry point should feel like a native productivity aid, closer to a Copilot-style panel than a separate page.

## Expected Outcome

- Users can open and close the assistant from any page.
- The panel feels integrated with the shell and theme system.
- The assistant composer is visually polished and ergonomic for longer prompts.
- The layout behaves predictably when the panel opens, closes, and is resized.
