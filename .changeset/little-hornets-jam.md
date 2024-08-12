---
"@effect/schema": patch
---

add Schema.ArrayEnsure & Schema.NonEmptyArrayEnsure

These schemas can be used to ensure that a value is an array, from a value that may be an array or a single value.

```ts
import { Schema } from "@effect/schema";

const schema = Schema.ArrayEnsure(Schema.String);

Schema.decodeUnknownSync(schema)("hello");
// => ["hello"]

Schema.decodeUnknownSync(schema)(["a", "b", "c"]);
// => ["a", "b", "c"]
```
