---
"effect": patch
---

Reject JSON Schema generation for unsupported UTF-16 string-length checks instead of emitting misleading code-point bounds. Runtime validation and array-length mappings are unchanged. Use `isMinCodePoints`, `isMaxCodePoints`, or `isBetweenCodePoints` for code-point semantics, or provide an explicit `toJsonSchema` check annotation to preserve a custom mapping.
