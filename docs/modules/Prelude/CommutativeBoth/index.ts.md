---
title: Prelude/CommutativeBoth/index.ts
nav_order: 20
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [CommutativeBoth (interface)](#commutativeboth-interface)

---

# utils

## CommutativeBoth (interface)

An associative binary operator that combines two values of types `F[A]`
and `F[B]` to produce an `F[(A, B)]`.

**Signature**

```ts
export interface CommutativeBoth<F extends URIS, C = Auto> extends AssociativeBoth<F, C> {
  readonly CommutativeBoth: 'CommutativeBoth'
}
```

Added in v1.0.0
