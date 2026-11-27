---
"effect": patch
---

Fix the OTLP logger and tracer overflowing the stack on self-referencing arrays; the repeated array is exported as `"[Circular]"`.
