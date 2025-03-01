---
"effect": patch
---

Preserve branded primitive types in `DeepMutable` transformation, closes #4542.

Previously, applying `DeepMutable` to branded primitive types (e.g., `string & Brand.Brand<"mybrand">`) caused unexpected behavior, where `String` prototype methods were incorrectly inherited.

This fix ensures that branded types remain unchanged during transformation, preventing type inconsistencies.

**Example**

Before

```ts
import type { Brand, Types } from "effect"

type T = string & Brand.Brand<"mybrand">

/*
type Result = {
    [x: number]: string;
    toString: () => string;
    charAt: (pos: number) => string;
    charCodeAt: (index: number) => number;
    concat: (...strings: string[]) => string;
    indexOf: (searchString: string, position?: number) => number;
    ... 47 more ...;
    [BrandTypeId]: {
        ...;
    };
}
*/
type Result = Types.DeepMutable<T>
```

After

```ts
import type { Brand, Types } from "effect"

type T = string & Brand.Brand<"mybrand">

// type Result = string & Brand.Brand<"mybrand">
type Result = Types.DeepMutable<T>
```
