---
"effect": patch
---

Add `allowEmpty` to `LanguageModel.generateObject` and `Chat.generateObject` so callers can receive an `Option` value which `None` represent a response with no text content.
