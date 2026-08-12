---
"@effect/ai-anthropic": patch
---

Add the Claude 5 family (Sonnet 5, Opus 5, Fable 5, Mythos 5) to the Anthropic model capability table.

These models were absent from `getModelCapabilities`, so they fell through to the unknown-model branch: `maxOutputTokens` defaulted to 4096 (the API allows 128000) and `supportsStructuredOutput` was `false`. The latter silently broke `generateObject` — with no toolkit present, the request is sent without an output format, a forced tool, or any JSON instruction, so the model answers in prose and decoding fails with a `StructuredOutputError`. All four models support native structured outputs and 128K output tokens, matching the Opus 4.6–4.8 / Sonnet 4.6 group.
