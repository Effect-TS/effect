---
"@effect/platform-node": patch
"effect": patch
---

## Annotation Behavior

When you call `.annotations` on a schema, any identifier annotations that were previously set will now be removed. Identifiers are now always tied to the schema's `ast` reference (this was the intended behavior).

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.URL

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "URL": {
      "type": "string",
      "description": "a string to be decoded into a URL"
    }
  },
  "$ref": "#/$defs/URL"
}
*/

const annotated = Schema.URL.annotations({ description: "description" })

console.log(JSON.stringify(JSONSchema.make(annotated), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "description": "description"
}
*/
```

## OpenAPI 3.1 Compatibility

OpenAPI 3.1 does not allow `nullable: true`.
Instead, the schema will now correctly use `{ "type": "null" }` inside a union.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

console.log(
  JSON.stringify(
    JSONSchema.fromAST(schema.ast, {
      definitions: {},
      target: "openApi3.1"
    }),
    null,
    2
  )
)
/*
{
  "anyOf": [
    {
      "type": "string"
    },
    {
      "type": "null"
    }
  ]
}
*/
```

## Schema Description Deduplication

Previously, when a schema was reused, only the first description was kept.
Now, every property keeps its own description, even if the schema is reused.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schemaWithAnIdentifier = Schema.String.annotations({
  identifier: "my-id"
})

const schema = Schema.Struct({
  a: schemaWithAnIdentifier.annotations({
    description: "a-description"
  }),
  b: schemaWithAnIdentifier.annotations({
    description: "b-description"
  })
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "a",
    "b"
  ],
  "properties": {
    "a": {
      "type": "string",
      "description": "a-description"
    },
    "b": {
      "type": "string",
      "description": "b-description"
    }
  },
  "additionalProperties": false
}
*/
```

## Fragment Detection in Non-Refinement Schemas

This patch fixes the issue where fragments (e.g. `jsonSchema.format`) were not detected on non-refinement schemas.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.UUID.pipe(
  Schema.compose(Schema.String),
  Schema.annotations({
    identifier: "UUID",
    title: "title",
    description: "description",
    jsonSchema: {
      format: "uuid" // fragment
    }
  })
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "UUID": {
      "type": "string",
      "description": "description",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
      "title": "title"
    }
  },
  "$ref": "#/$defs/UUID"
}
*/
```

## Nested Unions

Nested unions are no longer flattened. Instead, they remain as nested `anyOf` arrays.
This is fine because JSON Schema allows nested `anyOf`.

**Example**

```ts
import { JSONSchema, Schema } from "effect"

const schema = Schema.Union(
  Schema.NullOr(Schema.String),
  Schema.Literal("a", null)
)

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    {
      "anyOf": [
        {
          "type": "string",
          "enum": [
            "a"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  ]
}
*/
```

## Refinements without `jsonSchema` annotation

Refinements that don't provide a `jsonSchema` annotation no longer cause errors.
They are simply ignored, so you can still generate a JSON Schema even when refinements can't easily be expressed.
