---
"effect": minor
---

Add `HandlerContext.modelOutput`, which lets a tool handler set the content sent to the model for its final result in place of the tool's `toModelOutput` mapping.

Manually constructed `Toolkit.HandlerContext` values, such as those passed to handlers in tests, must include `modelOutput` (use `() => Effect.void` to discard the output).
