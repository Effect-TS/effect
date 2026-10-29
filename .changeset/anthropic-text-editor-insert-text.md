---
"@effect/ai-anthropic": patch
---

Fix the Anthropic text editor tools rejecting every `insert` call. `AnthropicTool.TextEditorInsertCommand` declared the inserted text as `new_str`, but the API sends it as `insert_text`, so the call failed to decode and the handler never ran.
