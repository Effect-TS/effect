---
"@effect/platform-node": patch
---

Preserve original response bytes in the Node HTTP and Undici clients when the text reader is accessed or consumed before `arrayBuffer`. Binary data and UTF-8 byte-order marks are no longer lost through text re-encoding.
