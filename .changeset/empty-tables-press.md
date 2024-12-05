---
"effect": patch
---

Fix the `Schema.TemplateLiteral` output type when the arguments include a branded type.

Before

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteral(
  "a ",
  Schema.String.pipe(Schema.brand("MyBrand"))
)

// type Type = `a ${Schema.brand<typeof Schema.String, "MyBrand"> & string}`
// | `a ${Schema.brand<typeof Schema.String, "MyBrand"> & number}`
// | `a ${Schema.brand<typeof Schema.String, "MyBrand"> & bigint}`
// | `a ${Schema.brand<...> & false}`
// | `a ${Schema.brand<...> & true}`
type Type = typeof schema.Type
```

After

```ts
import { Schema } from "effect"

const schema = Schema.TemplateLiteral(
  "a ",
  Schema.String.pipe(Schema.brand("MyBrand"))
)

// type Type = `a ${string & Brand<"MyBrand">}`
type Type = typeof schema.Type
```
