---
"effect": patch
---

Fix `Schema.Enums` `toString()` method to display correct enum values.

Now, `toString()` correctly displays the actual enum values instead of internal numeric indices.

**Before**

```ts
import { Schema } from "effect"

enum Fruits {
  Apple = "apple",
  Banana = "banana",
  Cantaloupe = 0
}

const schema = Schema.Enums(Fruits)

console.log(String(schema))
// Output: <enum 3 value(s): 0 | 1 | 2> ❌ (incorrect)
```

**After**

```ts
import { Schema } from "effect"

enum Fruits {
  Apple = "apple",
  Banana = "banana",
  Cantaloupe = 0
}

const schema = Schema.Enums(Fruits)

console.log(String(schema))
// Output: <enum 3 value(s): "apple" | "banana" | 0> ✅ (correct)
```
