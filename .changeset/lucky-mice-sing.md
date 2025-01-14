---
"effect": patch
---

Fix: Allow `Schema.TemplateLiteral` to handle strings with linebreaks, closes #4251.

**Before**

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteral("a: ", Schema.String)

console.log(Schema.decodeSync(schema)("a: b \n c"))
// throws: ParseError: Expected `a: ${string}`, actual "a: b \n c"
```

**After**

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteral("a: ", Schema.String)

console.log(Schema.decodeSync(schema)("a: b \n c"))
/*
Output:
a: b
 c
*/
```
