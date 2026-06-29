---
"@effect/ai-openai": patch
---

Map the OpenAI Responses `max_output_tokens` finish reason to `"length"`.

The OpenAI Responses API reports a budget/output-length truncation as
`response.incomplete` with `incomplete_details.reason: "max_output_tokens"`
(distinct from the Chat Completions `finish_reason: "length"`). That key was
missing from the internal `finishReasonMap`, so `resolveFinishReason` fell
through to `"unknown"` for a genuinely length-truncated response instead of the
portable `"length"` finish reason. A truncated turn now surfaces with
`finishReason: "length"`, so consumers can distinguish (and react to) a
budget-truncated response rather than treating it as an unknown/transport-level
failure. `content_filter` was already mapped; only `max_output_tokens` was
missing.
