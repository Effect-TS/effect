---
"effect": patch
---

Schema: improve error messages for invalid transformations

**Before**

```ts
import { Schema } from "effect"

Schema.decodeUnknownSync(Schema.NumberFromString)("a")
/*
throws:
ParseError: NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "a"
*/
```

**After**

```ts
import { Schema } from "effect"

Schema.decodeUnknownSync(Schema.NumberFromString)("a")
/*
throws:
ParseError: NumberFromString
└─ Transformation process failure
   └─ Unable to decode "a" into a number
*/
```
