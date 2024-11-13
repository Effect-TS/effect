---
"@effect/platform": patch
---

Added the ability to annotate the `HttpApi` with additional schemas
Which will be taken into account when generating `components.schemas` section of `OpenApi` schema

```ts
import { Schema } from "effect"
import { HttpApi } from "@effect/platform"

HttpApi.empty.annotate(
  HttpApi.ApiAdditionalSchemas,
  new Set([
    Schema.Struct({
      contentType: Schema.String,
      length: Schema.Int
    }).annotations({
      identifier: "ComponentsSchema"
    })
  ])
)
/**
 {
  "openapi": "3.0.3",
  ...
  "components": {
    "schemas": {
      "ComponentsSchema": {...},
      ...
  },
  ...
  }
 */
```
