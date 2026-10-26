---
"@effect/platform-node-shared": patch
---

Fix `NodeStream.toString` applying `maxBytes` to the decoded text instead of the bytes read, which rejected valid Latin-1, hex, base64 and malformed UTF-8 input and accepted oversized UTF-16 input.
