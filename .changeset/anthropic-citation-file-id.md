---
"@effect/ai-anthropic": patch
---

Fix Anthropic responses with citations failing to decode when the cited document was not uploaded to the Files API, so their citations carry no `file_id`.
