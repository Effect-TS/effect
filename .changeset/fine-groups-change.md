---
"effect": minor
---

Add HashMap.existsBy helper

```ts
import { HashMap } from "effect"

const hm = HashMap.make([1, 'a'])
HashMap.existsBy(hm, (value, key) => value === 'a' && key === 1); // -> true
HashMap.existsBy(hm, (value) => value === 'b'); // -> false

```
