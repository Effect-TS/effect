---
"@effect/schema": patch
---

Add `toString` to `AST.PropertySignature` and `AST.IndexSignature` and fix type display for IndexSignature.

**Before the Change**

Previously, when a type mismatch occurred in `Schema.decodeUnknownSync`, the error message displayed for `IndexSignature` was not accurately representing the type used. For example:

```typescript
import { Schema } from "@effect/schema"

const schema = Schema.Record(Schema.Char, Schema.String)

Schema.decodeUnknownSync(schema)({ a: 1 })
/*
throws
ParseError: { readonly [x: string]: string }
└─ ["a"]
   └─ Expected string, actual 1
*/
```

This output incorrectly indicated `[x: string]` when the actual index type was `Char`.

**After the Change**

The `toString` implementation now correctly reflects the type used in `IndexSignature`, providing more accurate and informative error messages:

```ts
import { Schema } from "@effect/schema"

const schema = Schema.Record(Schema.Char, Schema.String)

Schema.decodeUnknownSync(schema)({ a: 1 })
/*
throws
ParseError: { readonly [x: Char]: string }
└─ ["a"]
   └─ Expected string, actual 1
*/
```

The updated output now correctly displays `{ readonly [x: Char]: string }`, aligning the error messages with the actual data types used in the schema.
