---
"effect": patch
---

Preserve specific annotations (e.g., `arbitrary`) when using `Schema.typeSchema`, closes #4609.

Previously, annotations such as `arbitrary` were lost when calling `Schema.typeSchema` on a transformation. This update ensures that certain annotations, which depend only on the "to" side of the transformation, are preserved.

Annotations that are now retained:

- `examples`
- `default`
- `jsonSchema`
- `arbitrary`
- `pretty`
- `equivalence`

**Example**

Before

```ts
import { Arbitrary, FastCheck, Schema } from "effect"

const schema = Schema.NumberFromString.annotations({
  arbitrary: () => (fc) => fc.constant(1)
})

const to = Schema.typeSchema(schema) // ❌ Annotation is lost

console.log(FastCheck.sample(Arbitrary.make(to), 5))
/*
[
  2.5223372357846707e-44,
  -2.145443957806771e+25,
  -3.4028179901346956e+38,
  5.278086259208735e+29,
  1.8216880036222622e-44
]
*/
```

After

```ts
import { Arbitrary, FastCheck, Schema } from "effect"

const schema = Schema.NumberFromString.annotations({
  arbitrary: () => (fc) => fc.constant(1)
})

const to = Schema.typeSchema(schema) // ✅ Annotation is now preserved

console.log(FastCheck.sample(Arbitrary.make(to), 5))
/*
[ 1, 1, 1, 1, 1 ]
*/
```
