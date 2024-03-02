---
"effect": patch
---

Brand: add `refined` overload

```ts
export function refined<A extends Brand<any>>(
  f: (unbranded: Brand.Unbranded<A>) => Option.Option<Brand.BrandErrors>
): Brand.Constructor<A>;
```

Either: fix `getEquivalence` parameter order from `Either.getEquivalence(left, right)` to `Either.getEquivalence({ left, right })`
