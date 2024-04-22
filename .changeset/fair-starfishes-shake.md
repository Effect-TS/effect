---
"@effect/schema": minor
---

- change `BrandSchema` interface from

```ts
export interface BrandSchema<A extends brand_.Brand<any>, I>
  extends Annotable<BrandSchema<A, I>, A, I>,
    Brand.Constructor<A> {}
```

to

```ts
export interface BrandSchema<A extends brand_.Brand<any>, I>
  extends Annotable<BrandSchema<A, I>, A, I> {
  (args: Brand.Unbranded<A>): A
}
```
