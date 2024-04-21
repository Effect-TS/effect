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
  (args: brand_.Brand.Unbranded<A>): A
}
```

- add decoding / encoding / validation methods to `Schema` interface:
  - is
