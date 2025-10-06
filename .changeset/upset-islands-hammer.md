---
"effect": patch
---

Fix JSON Schema generation with `topLevelReferenceStrategy: "skip"`, closes #5611

This patch fixes a bug that occurred when generating JSON Schemas with nested schemas that had identifiers, while using `topLevelReferenceStrategy: "skip"`.

Previously, the generator would still output `$ref` entries even though references were supposed to be skipped, leaving unresolved definitions.

**Before**

```ts
import { JSONSchema, Schema } from "effect"

const A = Schema.Struct({ value: Schema.String }).annotations({
  identifier: "A"
})
const B = Schema.Struct({ a: A }).annotations({ identifier: "B" })

const definitions = {}
console.log(
  JSON.stringify(
    JSONSchema.fromAST(B.ast, {
      definitions,
      topLevelReferenceStrategy: "skip"
    }),
    null,
    2
  )
)
/*
{
  "type": "object",
  "required": ["a"],
  "properties": {
    "a": {
      "$ref": "#/$defs/A"
    }
  },
  "additionalProperties": false
}
*/
console.log(definitions)
/*
{
  A: {
    type: "object",
    required: ["value"],
    properties: { value: [Object] },
    additionalProperties: false
  }
}
*/
```

**After**

```ts
import { JSONSchema, Schema } from "effect"

const A = Schema.Struct({ value: Schema.String }).annotations({
  identifier: "A"
})
const B = Schema.Struct({ a: A }).annotations({ identifier: "B" })

const definitions = {}
console.log(
  JSON.stringify(
    JSONSchema.fromAST(B.ast, {
      definitions,
      topLevelReferenceStrategy: "skip"
    }),
    null,
    2
  )
)
/*
{
  "type": "object",
  "required": ["a"],
  "properties": {
    "a": {
      "type": "object",
      "required": ["value"],
      "properties": {
        "value": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
*/
console.log(definitions)
/*
{}
*/
```

Now schemas are correctly inlined, and no leftover `$ref` entries or unused definitions remain.
