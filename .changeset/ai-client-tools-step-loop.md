---
"effect": patch
---

Add client-executed tools to `effect/ai` with `Tool.make` and `Tool.dynamic`'s `execution: "client"` option, and a `maxSteps` option to `Chat.streamText` that runs the model again with resolved tool results.
