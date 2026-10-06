---
"effect": patch
---

Fix `HttpApi` form-urlencoded and GET payloads rejecting an array field that holds a single value. The value arrives as a bare string, so it is now decoded the same way the `query` slot already decodes it.
