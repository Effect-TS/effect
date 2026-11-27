---
"effect": patch
---

The HTTP server no longer reports `Schema.SchemaError` and `Cause.NoSuchElementError` failures that it answers with `400` or `404` to `ErrorReporter`s.
