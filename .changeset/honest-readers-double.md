---
"effect": patch
---

Improve consistency between request batching and fiber environment.

In prior releases request batching required operators that act on fiber context such as `Effect.locally` to be aware of batching in order to avoid bugs where the effect executed post batching would lose the fiber environment (context, refs, and flags).

This change restructure how batching internally works, inside the fiber we now slice up the stack and restore the exact context that was destroyed, by rewriting the internals of forEach batching is now transparent to any other function that deals with fiber state.
