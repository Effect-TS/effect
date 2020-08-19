---
title: Prelude/CommutativeEither/index.ts
nav_order: 21
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [CommutativeEither (interface)](#commutativeeither-interface)

---

# utils

## CommutativeEither (interface)

A commutative binary operator that combines two values of types `F[A]` and
`F[B]` to produce an `F[Either[A, B]]`.

**Signature**

```ts
export interface CommutativeEither<F extends URIS, C = Auto> extends AssociativeEither<F, C> {
  readonly CommutativeEither: 'CommutativeEither'
}
```

Added in v1.0.0
