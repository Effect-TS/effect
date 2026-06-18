---
"@effect/ai-openai": patch
---

Skip unrecognized or malformed events in OpenAI streaming responses instead of aborting the whole stream.

OpenAI emits events that are absent from the generated OpenAPI schema — most visibly `{"type":"keepalive"}` SSE heartbeats during long Responses turns (reasoning, tool calls, web search). These previously failed strict per-event decoding with `MalformedOutput` and tore down the entire in-progress stream. Such frames are now skipped (logged at debug level) and the stream continues; every recognized event is still decoded as before.
