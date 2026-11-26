---
"effect": patch
---

Stop reporting `Schema.SchemaError` (`400`) and `Cause.NoSuchElementError` (`404`) handler failures to `ErrorReporter`s. The HTTP server already answers them with a client error, like other client errors that opt out with `ErrorReporter.ignore`. The failure is still seen by middleware, the logger and tracing.
