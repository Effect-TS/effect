---
"@effect/ai-openai": patch
---

Fix successful `OpenAiTool.Shell` and `OpenAiTool.LocalShell` results being sent to the Responses API wrapped in an extra `output` object.
