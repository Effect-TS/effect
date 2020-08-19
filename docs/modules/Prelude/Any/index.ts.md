---
title: Prelude/Any/index.ts
nav_order: 15
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Any (interface)](#any-interface)

---

# utils

## Any (interface)

**Signature**

```ts
export interface Any<F extends URIS, C = Auto> extends Base<F> {
  readonly any: <S, SI, SO>() => Kind<
    F,
    OrN<C, any>,
    OrK<C, any>,
    SI,
    SO,
    OrX<C, any>,
    OrI<C, any>,
    OrS<C, S>,
    OrR<C, any>,
    OrE<C, any>,
    any
  >
}
```

Added in v1.0.0
