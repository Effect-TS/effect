---
"effect": patch
---

Fix handler-local `request.url` for parameterized and percent-encoded `HttpRouter` prefixes, respecting duplicate-slash configuration.
