---
"@effect/ai-openai": patch
---

Retry an OpenAI websocket turn with the full prompt when the provider returns previous_response_not_found, and keep the socket when it is still open.
