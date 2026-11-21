---
"effect": patch
---

Fix `Chat` history placing the model's answer between an approved or denied tool call and its result, so later requests send the result right after its call.
