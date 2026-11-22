---
"effect": patch
---

Redact `Redacted` query, header and path param values in HttpApi client and server spans without listing them in `HttpApi.RedactedNames`. Client error messages no longer show a `Redacted` path param. Query and header fields of a GET payload are redacted too. A struct whose keys are renamed by its encoding redacts all of its query parameters.
