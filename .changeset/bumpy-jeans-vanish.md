---
"@effect/platform-node": patch
"effect": patch
---

## Schema Annotations Behavior

With this patch, calling `annotations` on a schema removes any previously defined identifier annotations.
Identifiers are now strictly tied to the schema's `ast` reference.

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

This patch fixes the use of `nullable: true`, which is not valid in OpenAPI 3.1.
Instead, schemas now include `{ "type": "null" }` as a union member.

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

This patch fixes the issue where only the description from the first occurrence of a schema (in `$defs`) was included.
Now, each property keeps its own description.

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
