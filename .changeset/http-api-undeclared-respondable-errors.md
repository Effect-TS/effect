---
"effect": patch
---

Allow undeclared `HttpServerRespondable` errors in `HttpApiBuilder` to render their own responses when error schema encoding fails. Oversized multipart streaming uploads now return 413 instead of 500, while declared error schemas retain precedence.
