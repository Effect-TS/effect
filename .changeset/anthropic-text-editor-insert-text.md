---
"@effect/ai-anthropic": patch
---

Fix `insert` commands failing to decode for `AnthropicTool.TextEditor_20250429` and `TextEditor_20250728`, which send `insert_text`. These versions now use the new `TextEditorInsertTextCommand` schema. `TextEditorInsertCommand` is unchanged and keeps `new_str` for `TextEditor_20241022` and `TextEditor_20250124`.
