---
title: Prelude/FX/Run/index.ts
nav_order: 27
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Run (interface)](#run-interface)

---

# utils

## Run (interface)

**Signature**

```ts
export interface Run<F extends URIS, C = Auto> extends Base<F> {
  readonly run: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  ) => Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, never>,
    Either<OrE<C, E>, A>
  >
}
```

Added in v1.0.0
