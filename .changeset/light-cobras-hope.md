---
"@effect/schema": patch
---

Improving Predicate Usability of `Schema.is`

Before this update, the `Schema.is(mySchema)` function couldn't be easily used as a predicate or refinement in common array methods like `filter` or `find`. This was because the function's signature was:

```ts
(value: unknown, overrideOptions?: AST.ParseOptions) => value is A
```

Meanwhile, the function expected by methods like `filter` has the following signature:

```ts
(value: unknown, index: number) => value is A
```

To make `Schema.is` compatible with these array methods, we've adjusted the function's signature to accept `number` as a possible value for the second parameter, in which case it is ignored:

```diff
-(value: unknown, overrideOptions?: AST.ParseOptions) => value is A
+(value: unknown, overrideOptions?: AST.ParseOptions | number) => value is A
```

Here's a practical example comparing the behavior before and after the change:

**Before:**

```ts
import { Schema } from "@effect/schema"

declare const array: Array<string | number>

/*
Throws an error:
No overload matches this call.
...
Types of parameters 'overrideOptions' and 'index' are incompatible.
*/
const strings = array.filter(Schema.is(Schema.String))
```

**Now:**

```ts
import { Schema } from "@effect/schema"

declare const array: Array<string | number>

// const strings: string[]
const strings = array.filter(Schema.is(Schema.String))
```

Note that the result has been correctly narrowed to `string[]`.
