---
"effect": patch
---

Fix in-memory `MessageStorage.clearAddress` leaving unread interrupt and chunk acknowledgement messages behind after clearing an entity's requests and replies.
