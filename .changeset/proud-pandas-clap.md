---
"@effect/schema": patch
---

align runtime tuple behaviour to ts 5.4:

from

```ts
// ts 5.3
type A = readonly [string, ...number[], boolean];
type B = Required<A>; // readonly [string, ...(number | boolean)[], number | boolean]
```

to

```ts
// ts 5.4
type A = readonly [string, ...number[], boolean];
type B = Required<A>; // readonly [string, ...number[], boolean]
```
