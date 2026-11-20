---
"effect": patch
---

Extend the AOT/JIT Schema fast paths to declarations that are safe to compile: `effect/schema/Json` index signatures (the `additionalProperties: true` shape) and check-free `effect/schema/Uint8Array` fields. Structs containing these children now emit generated `is`/`decode` operations instead of falling back to the interpreter for the whole struct. Also cache declared property names per AST in excess-property checks to avoid rebuilding a Set on every parse.
