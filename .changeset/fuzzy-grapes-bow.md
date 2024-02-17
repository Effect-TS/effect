---
"effect": patch
---

add Hash.cached and Hash.cachedMethod

These apis assist with adding a layer of caching, when hashing immutable data structures.

```ts
import { Data, Hash } from "effect";

class User extends Data.Class<{
  id: number;
  name: string;
}> {
  [Hash.symbol]() {
    return Hash.cached(this, Hash.string(`${this.id}-${this.name}`));
  }
}
```
