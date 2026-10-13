---
"@effect/ai-openai": patch
---

End a Responses event stream at the Chat Completions sentinel `data: [DONE]`, which some OpenAI-compatible servers send, instead of failing to decode it.
