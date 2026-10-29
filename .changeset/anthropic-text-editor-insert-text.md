---
"@effect/ai-anthropic": patch
---

Fix `insert` calls failing to decode for `AnthropicTool.TextEditor_20250429` and `TextEditor_20250728`. `TextEditorInsertCommand` now reads `insert_text`. The older `TextEditor_20241022` and `TextEditor_20250124` tools keep `new_str` through the new `TextEditorLegacyInsertCommand`.
