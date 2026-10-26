---
"@effect/platform-node-shared": patch
---

Make `NodeStream.toString` enforce `maxBytes` on the bytes read instead of the decoded text, which rejected non-UTF-8 input at the limit and accepted oversized UTF-16 input.
