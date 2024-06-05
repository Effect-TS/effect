---
"@effect/schema": patch
---

TODO: ^---- change `patch` to `minor`

## Enhancing Tuples with Element Annotations

Annotations are used to add metadata to tuple elements, which can describe the purpose or requirements of each element more clearly. This can be particularly useful when generating documentation or JSON schemas from your schemas.

```ts
import { JSONSchema, Schema } from "@effect/schema"

// Defining a tuple with annotations for each coordinate in a point
const Point = Schema.Tuple(
  Schema.element(Schema.Number).annotations({
    title: "X",
    description: "X coordinate"
  }),
  Schema.optionalElement(Schema.Number).annotations({
    title: "Y",
    description: "optional Y coordinate"
  })
)

// Generating a JSON Schema from the tuple
console.log(JSONSchema.make(Point))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'array',
  minItems: 1,
  items: [
    { type: 'number', description: 'X coordinate', title: 'X' },
    {
      type: 'number',
      description: 'optional Y coordinate',
      title: 'Y'
    }
  ],
  additionalItems: false
}
*/
```

## Missing messages

You can provide custom messages for missing fields or elements using the new `missingMessage` annotation.

Example (missing field)

```ts
import { Schema } from "@effect/schema"

const Person = Schema.Struct({
  name: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "Name is required"
  })
})

Schema.decodeUnknownSync(Person)({})
/*
Output:
Error: { readonly name: string }
└─ ["name"]
   └─ Name is required
*/
```

Example (missing element)

```ts
import { Schema } from "@effect/schema"

const Point = Schema.Tuple(
  Schema.element(Schema.Number).annotations({
    missingMessage: () => "X coordinate is required"
  }),
  Schema.element(Schema.Number).annotations({
    missingMessage: () => "Y coordinate is required"
  })
)

Schema.decodeUnknownSync(Point)([], { errors: "all" })
/*
Output:
Error: readonly [number, number]
├─ [0]
│  └─ X coordinate is required
└─ [1]
   └─ Y coordinate is required
*/
```

## Changes

AST

- add `MissingMessageAnnotation` annotations
- add `Type`

**Breaking**

- rename `Element` to `OptionalType` and add an `annotations` field
- change `TupleType` definition: from `rest: ReadonlyArray<AST>` to `rest: ReadonlyArray<Type>`
- remove `TemplateLiteral.make`

Schema

- add `missingMessage` annotation to `PropertySignature`

**Breaking**

- remove `TupleType.Element` type
- replace `OptionalElement` API interface with `Element` API interface
- remove `PropertySignature.GetToken`

ParseResult

**Breaking**

- `Missing`
  - add `ast: AST.Type` field
  - add `message` field
- remove `missing` export
- `Unexpected`
  - replace `ast` field with a `message` field
