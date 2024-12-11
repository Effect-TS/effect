---
"effect": patch
---

Allow the transformation created by the Class API to be annotated on all its components: the type side, the transformation itself, and the encoded side.

**Example**

```ts
import { Schema, SchemaAST } from "effect"

class A extends Schema.Class<A>("A")(
  {
    a: Schema.NonEmptyString
  },
  [
    { identifier: "TypeID" }, // annotations for the type side
    { identifier: "TransformationID" }, // annotations for the the transformation itself
    { identifier: "EncodedID" } // annotations for the the encoded side
  ]
) {}

console.log(SchemaAST.getIdentifierAnnotation(A.ast.to)) // Some("TypeID")
console.log(SchemaAST.getIdentifierAnnotation(A.ast)) // Some("TransformationID")
console.log(SchemaAST.getIdentifierAnnotation(A.ast.from)) // Some("EncodedID")

A.make({ a: "" })
/*
ParseError: TypeID
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected NonEmptyString, actual ""
*/

Schema.encodeSync(A)({ a: "" })
/*
ParseError: TransformationID
└─ Type side transformation failure
   └─ TypeID
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""
*/
```
