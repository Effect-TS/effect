---
"effect": patch
---

Fix `LanguageModel.streamText` omitting approved and denied tool results when `disableToolCallResolution` is set, causing `Chat.streamText` to rerun approved tools on later turns.
