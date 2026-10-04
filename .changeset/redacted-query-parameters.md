---
"effect": patch
---

Support `Redacted<string>` in URL parameters and preserve redaction through HTTP API query encoding, sending the underlying values while masking HTTP client `url.full` and `url.query` trace attributes. Values obtained through `UrlParams.params`, iteration, transform callbacks, and AI HTTP request metadata can now be `string | Redacted<string>`; consumers handling these values directly must narrow the union. Existing string getters and serializers continue to unwrap values, so use iteration or `UrlParams.transform` when copying or updating parameters that must retain redaction.
