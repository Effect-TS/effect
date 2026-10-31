---
"effect": minor
---

Import JSON Schema objects with `patternProperties` when unmatched keys are allowed. Unmatched keys are typed as `Schema.Json`, and each pattern becomes a `Schema.isPatternProperties` check that validates the matching values. Add `Schema.isPatternProperties` and the matching `SchemaRepresentation.isPatternPropertiesReviver`.
