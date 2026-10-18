---
"effect": patch
---

Fix `Channel.decodeText` and `Stream.decodeText` dropping incomplete trailing characters. Flush buffered bytes on normal completion, emitting U+FFFD by default or a defect with `fatal: true`.
