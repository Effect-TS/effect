---
"effect": patch
---

Support `Redacted<string>` in URL parameters, sending the underlying values while masking them in HTTP client `url.full` and `url.query` trace attributes. Values obtained through `UrlParams.params`, iteration, transform callbacks, and AI HTTP request metadata can now be `string | Redacted<string>`; consumers handling these values directly must narrow the union. Existing string getters and serializers continue to unwrap values.
