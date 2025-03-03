---
"effect": patch
---

Arbitrary: `make` called on `Schema.Class` now respects property annotations, closes #4550.

Previously, when calling `Arbitrary.make` on a `Schema.Class`, property-specific annotations (such as `arbitrary`) were ignored, leading to unexpected values in generated instances.

Before

Even though `a` had an `arbitrary` annotation, the generated values were random:

```ts
import { Arbitrary, FastCheck, Schema } from "effect"

class Class extends Schema.Class<Class>("Class")({
  a: Schema.NumberFromString.annotations({
    arbitrary: () => (fc) => fc.constant(1)
  })
}) {}

console.log(FastCheck.sample(Arbitrary.make(Class), 5))
/*
Example Output:
[
  Class { a: 2.6624670822171524e-44 },
  Class { a: 3.4028177873105996e+38 },
  Class { a: 3.402820626847944e+38 },
  Class { a: 3.783505853677006e-44 },
  Class { a: 3243685 }
]
*/
```

After

Now, the values respect the `arbitrary` annotation and return the expected constant:

```ts
import { Arbitrary, FastCheck, Schema } from "effect"

class Class extends Schema.Class<Class>("Class")({
  a: Schema.NumberFromString.annotations({
    arbitrary: () => (fc) => fc.constant(1)
  })
}) {}

console.log(FastCheck.sample(Arbitrary.make(Class), 5))
/*
[
  Class { a: 1 },
  Class { a: 1 },
  Class { a: 1 },
  Class { a: 1 },
  Class { a: 1 }
]
*/
```
