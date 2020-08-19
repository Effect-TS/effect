---
title: Prelude/Covariant/index.ts
nav_order: 23
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Covariant (interface)](#covariant-interface)
  - [CovariantComposition (interface)](#covariantcomposition-interface)
  - [getCovariantComposition](#getcovariantcomposition)

---

# utils

## Covariant (interface)

**Signature**

```ts
export interface Covariant<F extends URIS, C = Auto> extends Base<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  ) => Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, B>
}
```

Added in v1.0.0

## CovariantComposition (interface)

**Signature**

```ts
export interface CovariantComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto>
  extends CompositionBase2<F, G> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE, GN extends string, GK, GSI, GSO, GX, GI, GS, GR, GE>(
    fa: Kind<
      F,
      OrN<CF, FN>,
      OrK<CF, FK>,
      FSI,
      FSO,
      OrX<CF, FX>,
      OrI<CF, FI>,
      OrS<CF, FS>,
      OrR<CF, FR>,
      OrE<CF, FE>,
      Kind<G, OrN<CG, GN>, OrK<CG, GK>, GSI, GSO, OrX<CG, GX>, OrI<CG, GI>, OrS<CG, GS>, OrR<CG, GR>, OrE<CG, GE>, A>
    >
  ) => Kind<
    F,
    OrN<CF, FN>,
    OrK<CF, FK>,
    FSI,
    FSO,
    OrX<CF, FX>,
    OrI<CF, FI>,
    OrS<CF, FS>,
    OrR<CF, FR>,
    OrE<CF, FE>,
    Kind<G, OrN<CG, GN>, OrK<CG, GK>, GSI, GSO, OrX<CG, GX>, OrI<CG, GI>, OrS<CG, GS>, OrR<CG, GR>, OrE<CG, GE>, B>
  >
}
```

Added in v1.0.0

## getCovariantComposition

**Signature**

```ts
export declare function getCovariantComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto>(
  F: Covariant<F, CF>,
  G: Covariant<G, CG>
): CovariantComposition<F, G, CF, CG>
```

Added in v1.0.0
