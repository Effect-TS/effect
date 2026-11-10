---
"effect": patch
---

Fix `HttpStaticServer` responding `200` instead of `304` when an `If-None-Match` entity-tag contains a comma.
