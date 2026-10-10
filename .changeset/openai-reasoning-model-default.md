---
"@effect/ai-openai": minor
---

Preserve explicit `include` values and default unknown OpenAI models to reasoning.

- Merge explicit and automatic includes without duplicates.
- Treat models as reasoning except for `gpt-3*`, `gpt-4*`, `chatgpt-*`, `chat-latest`, and `gpt-<version>-chat*`. Fine-tunes follow their base model. Reasoning models use the `developer` role and request encrypted reasoning when item references are disabled or WebSockets are used. OpenAI returns encrypted reasoning by default with `store: false`; the include is retained for compatibility.
- Add `reasoningModel` to override detection. Use `reasoningModel: false` for incompatible custom deployments to select the `system` role and disable the automatic encrypted reasoning include. Explicit includes are still preserved.
