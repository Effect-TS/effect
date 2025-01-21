---
"effect": patch
---

Schema: Add Support for Infinity in `Duration`.

This update adds support for encoding `Duration.infinity` in `Schema.Duration`.

**Before**

Attempting to encode `Duration.infinity` resulted in a `ParseError` due to the lack of support for `Infinity` in `Schema.Duration`:

```ts
import { Duration, Schema } from "effect"

console.log(Schema.encodeUnknownSync(Schema.Duration)(Duration.infinity))
/*
throws:
ParseError: Duration
└─ Encoded side transformation failure
   └─ HRTime
      └─ [0]
         └─ NonNegativeInt
            └─ Predicate refinement failure
               └─ Expected an integer, actual Infinity
*/
```

**After**

The updated behavior successfully encodes `Duration.infinity` as `[ -1, 0 ]`:

```ts
import { Duration, Schema } from "effect"

console.log(Schema.encodeUnknownSync(Schema.Duration)(Duration.infinity))
// Output: [ -1, 0 ]
```
