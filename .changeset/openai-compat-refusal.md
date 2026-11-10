---
"@effect/ai-openai-compat": patch
---

Preserve nonempty chat completion refusals in finish metadata and remap only refusal-bearing `stop` responses to `content-filter`, including streaming responses.
