---
title: Prelude/FX/Fail/index.ts
nav_order: 25
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Fail (interface)](#fail-interface)

---

# utils

## Fail (interface)

**Signature**

```ts
export interface Fail<F extends URIS, C = Auto> extends Base<F> {
  readonly fail: <SI, SO, S, E, A = never>(
    e: OrE<C, E>
  ) => Kind<
    F,
    OrN<C, never>,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, E>,
    A
  >
}
```

Added in v1.0.0
