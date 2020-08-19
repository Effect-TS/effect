---
title: Prelude/Traversable/index.ts
nav_order: 37
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Foreach (interface)](#foreach-interface)
  - [ForeachComposition (interface)](#foreachcomposition-interface)
  - [Traversable (interface)](#traversable-interface)
  - [TraversableComposition (interface)](#traversablecomposition-interface)
  - [getTraversableComposition](#gettraversablecomposition)
  - [implementForeachF](#implementforeachf)

---

# utils

## Foreach (interface)

**Signature**

```ts
export interface Foreach<F extends URIS, C = Auto> {
  <G extends URIS, GC = Auto>(G: IdentityBoth<G, GC> & Covariant<G, GC>): <
    GSIO,
    GN extends string,
    GK,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (
      a: A
    ) => Kind<
      G,
      OrN<GC, GN>,
      OrK<GC, GK>,
      GSIO,
      GSIO,
      OrX<GC, GX>,
      OrI<GC, GI>,
      OrS<GC, GS>,
      OrR<GC, GR>,
      OrE<GC, GE>,
      B
    >
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    fa: Kind<F, OrN<C, FN>, OrK<C, FK>, FSI, FSO, OrX<C, FX>, OrI<C, FI>, OrS<C, FS>, OrR<C, FR>, OrE<C, FE>, A>
  ) => Kind<
    G,
    OrN<GC, GN>,
    OrK<GC, GK>,
    GSIO,
    GSIO,
    OrX<GC, GX>,
    OrI<GC, GI>,
    OrS<GC, GS>,
    OrR<GC, GR>,
    OrE<GC, GE>,
    Kind<F, OrN<C, FN>, OrK<C, FK>, FSI, FSO, OrX<C, FX>, OrI<C, FI>, OrS<C, FS>, OrR<C, FR>, OrE<C, FE>, B>
  >
}
```

Added in v1.0.0

## ForeachComposition (interface)

**Signature**

```ts
export interface ForeachComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto> {
  <H extends URIS, CH = Auto>(H: IdentityBoth<H, CH> & Covariant<H, CH>): <
    HSIO,
    HN extends string,
    HK,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    f: (
      a: A
    ) => Kind<
      H,
      OrN<CH, HN>,
      OrK<CH, HK>,
      HSIO,
      HSIO,
      OrX<CH, HX>,
      OrI<CH, HI>,
      OrS<CH, HS>,
      OrR<CH, HR>,
      OrE<CH, HE>,
      B
    >
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
    H,
    OrN<CH, HN>,
    OrK<CH, HK>,
    HSIO,
    HSIO,
    OrX<CH, HX>,
    OrI<CH, HI>,
    OrS<CH, HS>,
    OrR<CH, HR>,
    OrE<CH, HE>,
    Kind<
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
  >
}
```

Added in v1.0.0

## Traversable (interface)

**Signature**

```ts
export interface Traversable<F extends URIS, C = Auto> extends Base<F>, Covariant<F, C> {
  readonly foreachF: Foreach<F, C>
}
```

Added in v1.0.0

## TraversableComposition (interface)

**Signature**

```ts
export interface TraversableComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto>
  extends CompositionBase2<F, G>,
    CovariantComposition<F, G, CF, CG> {
  readonly foreachF: ForeachComposition<F, G, CF, CG>
}
```

Added in v1.0.0

## getTraversableComposition

**Signature**

```ts
export declare function getTraversableComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto>(
  F: Traversable<F, CF>,
  G: Traversable<G, CG>
): TraversableComposition<F, G, CF, CG>
```

Added in v1.0.0

## implementForeachF

**Signature**

```ts
export declare function implementForeachF<F extends URIS, C = Auto>(): (
  i: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(_: {
    A: A
    B: B
    N: N
    K: K
    SI: SI
    SO: SO
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    G: IdentityBoth<UG_> & Covariant<UG_>
  ) => (
    f: (a: A) => G_<B>
  ) => (
    fa: Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  ) => G_<Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, B>>
) => Foreach<F, C>
```

Added in v1.0.0
