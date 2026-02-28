---
"effect": minor
---

Allow data classes to be branded with an additional type parameter

```ts
import { Data, HashMap } from "effect"

export class T extends Data.Class<
  { id: string },
  { readonly _brand: unique symbol }
> {}

// type error
export const hashMap1: HashMap.HashMap<T, string> = HashMap.empty().pipe(
  HashMap.set({ id: "one" }, "one"),
  HashMap.set({ id: "one" }, "two")
)

// no type error
export const hashMap2: HashMap.HashMap<T, string> = HashMap.empty().pipe(
  HashMap.set(new T({ id: "one" }), "one"),
  HashMap.set(new T({ id: "one" }), "two")
)
```
