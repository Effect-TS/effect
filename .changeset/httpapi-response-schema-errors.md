---
"effect": patch
---

Return 500 and report HTTP API response encoding failures to ErrorReporter, while keeping request decoding failures at 400 and unreported. Preserve response failures as HttpApiSchemaError values for schema-error middleware.
