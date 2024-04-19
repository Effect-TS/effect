---
"@effect/schema": patch
---

partial / required: add support for renaming property keys in property signature transformations

Before

```ts
import { Schema } from "@effect/schema"

const TestType = Schema.Struct({
  a: Schema.String,
  b: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("c"))
})

const PartialTestType = Schema.partial(TestType)
// throws Error: Partial: cannot handle transformations
```

Now

```ts
import { Schema } from "@effect/schema"

const TestType = Schema.Struct({
  a: Schema.String,
  b: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("c"))
})

const PartialTestType = Schema.partial(TestType)

console.log(Schema.decodeUnknownSync(PartialTestType)({ a: "a", c: "c" })) // { a: 'a', b: 'c' }
console.log(Schema.decodeUnknownSync(PartialTestType)({ a: "a" })) // { a: 'a' }

const RequiredTestType = Schema.required(PartialTestType)

console.log(Schema.decodeUnknownSync(RequiredTestType)({ a: "a", c: "c" })) // { a: 'a', b: 'c' }
console.log(Schema.decodeUnknownSync(RequiredTestType)({ a: "a" })) // { a: 'a', b: undefined }
```
