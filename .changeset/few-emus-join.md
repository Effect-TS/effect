---
"effect": patch
---

Schema: fix bug in `Schema.TemplateLiteralParser` resulting in a runtime error.

Before

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser("a", "b")
// throws TypeError: Cannot read properties of undefined (reading 'replace')
```

After

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser("a", "b")

console.log(Schema.decodeUnknownSync(schema)("ab"))
// Output: [ 'a', 'b' ]
```
