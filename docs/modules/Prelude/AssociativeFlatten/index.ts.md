---
title: Prelude/AssociativeFlatten/index.ts
nav_order: 18
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [AssociativeFlatten (interface)](#associativeflatten-interface)

---

# utils

## AssociativeFlatten (interface)

**Signature**

```ts
export interface AssociativeFlatten<F extends URIS, C = Auto> extends Base<F> {
  readonly flatten: <N extends string, K, SI, SO, X, I, R, E, A, N2 extends string, K2, SO2, X2, I2, S, R2, E2>(
    ffa: Kind<
      F,
      OrN<C, N2>,
      OrK<C, K2>,
      SI,
      SO,
      OrX<C, X2>,
      OrI<C, I2>,
      OrS<C, S>,
      OrR<C, R2>,
      OrE<C, E2>,
      Kind<F, OrN<C, N>, OrK<C, K>, SO, SO2, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
    >
  ) => Kind<
    F,
    OrN<C, N2>,
    OrK<C, K2>,
    SI,
    SO2,
    OrX<C, X | X2>,
    OrI<C, I & I2>,
    OrS<C, S>,
    OrR<C, R & R2>,
    OrE<C, E | E2>,
    A
  >
}
```

Added in v1.0.0
