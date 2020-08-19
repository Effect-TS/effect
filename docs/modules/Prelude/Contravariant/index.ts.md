---
title: Prelude/Contravariant/index.ts
nav_order: 22
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Contravariant (interface)](#contravariant-interface)
  - [getContravariantComposition](#getcontravariantcomposition)

---

# utils

## Contravariant (interface)

**Signature**

```ts
export interface Contravariant<F extends URIS, C = Auto> extends Base<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, A>
  ) => Kind<F, OrN<C, N>, OrK<C, K>, SI, SO, OrX<C, X>, OrI<C, I>, OrS<C, S>, OrR<C, R>, OrE<C, E>, B>
}
```

Added in v1.0.0

## getContravariantComposition

**Signature**

```ts
export declare function getContravariantComposition<F extends URIS, G extends URIS, CF = Auto, CG = Auto>(
  F: Contravariant<F, CF>,
  G: Contravariant<G, CG>
): CovariantComposition<F, G, CF, CG>
```

Added in v1.0.0
