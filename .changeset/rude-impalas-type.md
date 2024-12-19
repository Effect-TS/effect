---
"effect": patch
---

Schema: Add support for `TemplateLiteral` parameters in `TemplateLiteral`, closes #4166.

This update also adds support for `TemplateLiteral` and `TemplateLiteralParser` parameters in `TemplateLiteralParser`.

Before

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteralParser(
  "<",
  Schema.TemplateLiteralParser("h", Schema.Literal(1, 2)),
  ">"
)
/*
throws:
Error: Unsupported template literal span
schema (TemplateLiteral): `h${"1" | "2"}`
*/
```

After

```ts
import { Schema } from "effect"

// Schema<readonly ["<", readonly ["h", 2 | 1], ">"], "<h2>" | "<h1>", never>
const schema = Schema.TemplateLiteralParser(
  "<",
  Schema.TemplateLiteralParser("h", Schema.Literal(1, 2)),
  ">"
)

console.log(Schema.decodeUnknownSync(schema)("<h1>"))
// Output: [ '<', [ 'h', 1 ], '>' ]
```
