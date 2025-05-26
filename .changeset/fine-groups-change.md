---
"effect": minor
---

Add HashMap.hasBy helper

```ts
import { HashMap } from "effect"

const hm = HashMap.make([1, 'a'])
HashMap.hasBy(hm, (value, key) => value === 'a' && key === 1); // -> true
HashMap.hasBy(hm, (value) => value === 'b'); // -> false

```
