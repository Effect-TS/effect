---
"effect": patch
---

Fix `HttpRouter` prefixes with path parameters or percent-encoded characters giving handlers a broken `request.url`. The URL seen by a prefixed route now drops the path segments the prefix matched, so `HttpStaticServer.layer({ prefix: "/assets/:version" })` serves files again.
