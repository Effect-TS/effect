---
"effect": patch
---

The HTTP server no longer sends `Schema.SchemaError` and `Cause.NoSuchElementError` failures to `ErrorReporter`s when it answers them with `400` or `404`. Middleware, logging and tracing still see these failures.
