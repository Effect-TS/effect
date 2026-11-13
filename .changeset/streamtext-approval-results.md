---
"effect": patch
---

Fix `LanguageModel.streamText` dropping completed approval and denial results when tool call resolution is disabled, causing approved tools to replay in later chat turns.
