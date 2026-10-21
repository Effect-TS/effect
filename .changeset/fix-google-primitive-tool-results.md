---
"@effect/ai-google": patch
---

Wrap non-object tool results in `{ result }` before sending them to Gemini. The `functionResponse.response` field must be a JSON object, so primitive, `null` and array results previously failed with a 400.
