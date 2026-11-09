---
"@effect/ai-anthropic": patch
---

Fix Anthropic responses failing to decode citations without a `file_id`, which the API omits for documents not uploaded to the Files API.
