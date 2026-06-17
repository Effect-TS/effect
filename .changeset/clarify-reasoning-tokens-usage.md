---
"@effect/ai": patch
"@effect/ai-anthropic": patch
"@effect/ai-amazon-bedrock": patch
---

Clarify that `Response.Usage.reasoningTokens` is only populated by providers whose API reports reasoning tokens as a discrete value (e.g. OpenAI via `output_tokens_details.reasoning_tokens`).

The Anthropic Messages API and the Amazon Bedrock Converse API do **not** report reasoning tokens separately - when extended thinking is enabled, reasoning tokens are already included in `outputTokens`. The `@effect/ai-anthropic` and `@effect/ai-amazon-bedrock` providers therefore leave `reasoningTokens` unset. This documents the behavior so consumers do not rely on the field for cost calculations with these providers. No runtime behavior changes.
