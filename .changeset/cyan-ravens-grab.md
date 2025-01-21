---
"effect": patch
---

Schema: Enhance error messages for discriminated unions.

**Before**

```ts
import { Schema } from "effect"

const schema = Schema.Union(
  Schema.Tuple(Schema.Literal(-1), Schema.Literal(0)).annotations({
    identifier: "A"
  }),
  Schema.Tuple(Schema.NonNegativeInt, Schema.NonNegativeInt).annotations({
    identifier: "B"
  })
).annotations({ identifier: "AB" })

Schema.decodeUnknownSync(schema)([-500, 0])
/*
throws:
ParseError: AB
├─ { readonly 0: -1 }
│  └─ ["0"]
│     └─ Expected -1, actual -500
└─ B
   └─ [0]
      └─ NonNegativeInt
         └─ From side refinement failure
            └─ NonNegative
               └─ Predicate refinement failure
                  └─ Expected a non-negative number, actual -500
*/
```

**After**

```diff
import { Schema } from "effect"

const schema = Schema.Union(
  Schema.Tuple(Schema.Literal(-1), Schema.Literal(0)).annotations({
    identifier: "A"
  }),
  Schema.Tuple(Schema.NonNegativeInt, Schema.NonNegativeInt).annotations({
    identifier: "B"
  })
).annotations({ identifier: "AB" })

Schema.decodeUnknownSync(schema)([-500, 0])
/*
throws:
ParseError: AB
-├─ { readonly 0: -1 }
+├─ A
│  └─ ["0"]
│     └─ Expected -1, actual -500
└─ B
   └─ [0]
      └─ NonNegativeInt
         └─ From side refinement failure
            └─ NonNegative
               └─ Predicate refinement failure
                  └─ Expected a non-negative number, actual -500
*/
```
