---
title: Prelude/None/index.ts
nav_order: 36
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [None (interface)](#none-interface)

---

# utils

## None (interface)

**Signature**

```ts
export interface None<F extends URIS, C = Auto> extends Base<F> {
  readonly never: <S, SI, SO = SI>() => Kind<
    F,
    OrN<C, never>,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, never>,
    never
  >
}
```

Added in v1.0.0
