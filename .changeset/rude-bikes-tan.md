---
"@effect/ai-openai": patch
---

Fix streaming decode: response.output_item.added may emit web_search_call without action (when status="in_progress").
