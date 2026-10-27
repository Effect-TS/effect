---
"effect": patch
---

Add the `HttpApi.RedactedNames` annotation for declaring query parameter and header names of an API, group or endpoint to redact in `HttpApiClient` and `HttpApiBuilder` spans, for values that are only sometimes secret.
