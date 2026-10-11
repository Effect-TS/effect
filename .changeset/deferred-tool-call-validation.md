---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Add `toolCallValidation: "deferred"` for callers using `disableToolCallResolution: true`. Model-generated tool calls return with `unknown` parameters, including invalid parameters and undeclared tool names, even without a toolkit. Supported by the Anthropic, OpenAI, and OpenAI-compatible providers. Strict validation remains the default; provider-executed calls remain validated.
