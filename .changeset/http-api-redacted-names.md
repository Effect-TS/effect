---
"effect": patch
---

Add the `HttpApi.RedactedNames` annotation for declaring query parameter and header names of an API, group or endpoint to redact in the URL and header attributes of `HttpApiClient` and `HttpApiBuilder` spans, for values that are only sometimes secret. `addHttpApi` treats it like any other annotation, and `user_agent.original` is recorded as is.
