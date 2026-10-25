---
"effect": patch
---

Fix `Inspectable.BaseProto` serializing objects as `[toJSON threw]` instead of their own fields while preserving redaction.
