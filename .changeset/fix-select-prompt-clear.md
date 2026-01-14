---
"@effect/cli": patch
---

Fix `Prompt.select` rendering issue when choice descriptions cause terminal line wrapping.

The `handleClear` function now correctly calculates the number of terminal rows to erase by accounting for the actual rendered content length of each choice, including descriptions that are only shown for the selected item.
