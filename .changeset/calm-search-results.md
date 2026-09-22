---
"@effect/ai-openai": patch
---

Accept web searches without an action, preserving incomplete calls as failed tool results.
The `action` field is now optional on generated web-search calls and tool parameters/results.
