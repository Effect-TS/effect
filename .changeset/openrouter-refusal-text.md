---
"@effect/ai-openrouter": patch
---

Read a chat completion's `refusal` as its text. OpenRouter forwards OpenAI's refusal as a sibling of `content` rather than as a content part, so a refused turn arrives with `content: null` (or `""`) and the explanation only in `refusal`. Both translators dropped it, leaving `generateText` with `""`, and now take the message's text as its `content`, or else its `refusal`.
