---
"@effect/ai-anthropic": patch
---

Fix `insert` calls failing to decode for `AnthropicTool.TextEditor_20250429` and `TextEditor_20250728`. These tools now use the new `TextEditorInsertTextCommand`, which reads `insert_text`. `TextEditorInsertCommand` keeps `new_str` for `TextEditor_20241022` and `TextEditor_20250124`.
