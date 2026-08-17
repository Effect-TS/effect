---
"@effect/ai-openai": patch
---

Decode OpenAI Responses API `error` stream events whose payload is nested under `error`.

The Responses API documents the `error` stream event with `code`, `message`, and `param` at the top level, but mid-stream errors (for example quota exhaustion) instead emit the standard error envelope nested under `error` — `{ "type": "error", "error": { "code", "message", "param", ... }, "sequence_number" }`. The strict schema only matched the flat shape, so a nested error event failed to decode and aborted the whole stream with an opaque schema error (`Expected UnknownResponseStreamEvent … Missing key at ["data"]["code"]`) instead of surfacing the actual error.

`ResponseStreamEvent` now models the nested payload as its own union variant that hoists the envelope to the documented shape, so the error's `code` and `message` always surface and the decoded type is unchanged. Both variants stay as strict as the spec: malformed error events still fail to decode.
