---
title: Prelude/Derive/index.ts
nav_order: 24
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Derive (interface)](#derive-interface)

---

# utils

## Derive (interface)

**Signature**

```ts
export interface Derive<F extends URIS, Typeclass extends URIS, C = Auto> extends Base<F> {
  readonly derive: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<Typeclass, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  ) => Kind<
    Typeclass,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  >
}
```

Added in v1.0.0
