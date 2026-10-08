---
"effect": patch
---

Avoid opening terminal input for `Prompt.succeed` and compositions of successful prompts, preserving piped stdin when these prompts are used with `Flag.withFallbackPrompt`.
