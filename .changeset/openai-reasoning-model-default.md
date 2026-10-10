---
"@effect/ai-openai": minor
---

Keep encrypted reasoning working for new OpenAI models and preserve explicit `include` values.

- Explicit `include` values are now sent alongside the values added automatically, instead of being replaced by them.
- Models are now treated as reasoning models unless they are a known non-reasoning model (`gpt-3*`, `gpt-4*`, `chatgpt-*`, `chat-latest`, `gpt-<version>-chat*`). Fine-tuned `ft:` models follow their base model. Reasoning models use the `developer` role for system prompts and request `reasoning.encrypted_content` when responses are not stored, so models such as `gpt-6.1-sol` and `o5-mini` keep reasoning across stateless tool-call turns.
- Add the `reasoningModel` config option to override detection. Set `reasoningModel: false` for custom deployments or third-party models that do not support reasoning, which previously used the `system` role and no encrypted reasoning include.
