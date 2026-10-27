---
"effect": patch
---

Add `trim` and `keepEmptyValues` options to `SchemaGetter.splitKeyValue`, `SchemaTransformation.splitKeyValue` and `Config.Record`. Both default to `false`, so existing callers are unaffected.

`OtlpResource.fromConfig` now trims `OTEL_RESOURCE_ATTRIBUTES` keys and values and keeps entries with an empty value as `""`.
