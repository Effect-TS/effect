---
"@effect/ai-openai-compat": patch
---

Preserve tool call `extra_content` from OpenAI-compatible providers, so Gemini receives its thought signatures on follow-up tool turns. It is exposed as `metadata.openai.extraContent` on tool call response parts and sent back from the `openai.extraContent` tool call prompt option.
