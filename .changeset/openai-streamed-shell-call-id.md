---
"@effect/ai-openai": patch
---

Fix streamed `OpenAiTool.Shell` calls using the response item ID instead of `call_id`, which sent the wrong `shell_call_output.call_id` when continuing a stored `Chat`.
