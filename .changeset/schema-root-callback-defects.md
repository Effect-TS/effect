---
"effect": patch
---

Preserve synchronous throws from schema transformations, filters, middleware, and custom declaration parsers as defects when decoding or encoding, including at the root schema. Exit, Effect, and Promise parsers now report these defects through their result instead of throwing before returning.
