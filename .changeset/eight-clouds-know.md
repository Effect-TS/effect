---
"effect": patch
---

Brand: add `refined` overload

```ts
export function refined<A extends Brand<any>>(
  f: (unbranded: Brand.Unbranded<A>) => Option.Option<Brand.BrandErrors>
): Brand.Constructor<A>;
```
