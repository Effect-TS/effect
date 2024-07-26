---
"@effect/schema": patch
---

Improve annotation retrieval from `Class` APIs, closes #3348.

Previously, accessing annotations such as `identifier` and `title` required explicit casting of the `ast` field to `AST.Transformation`.
This update refines the type definitions to reflect that `ast` is always an `AST.Transformation`, eliminating the need for casting and simplifying client code.

```ts
import { AST, Schema } from "@effect/schema"

class Person extends Schema.Class<Person>("Person")(
  {
    name: Schema.String,
    age: Schema.Number
  },
  { description: "my description" }
) {}

console.log(AST.getDescriptionAnnotation(Person.ast.to))
// { _id: 'Option', _tag: 'Some', value: 'my description' }
```
