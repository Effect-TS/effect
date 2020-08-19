---
title: Prelude/FX/Validation/index.ts
nav_order: 28
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [getValidationF](#getvalidationf)

---

# utils

## getValidationF

**Signature**

```ts
export declare function getValidationF<F extends URIS, C = Auto>(
  F: Monad<F, C> & Run<F, C> & Fail<F, C> & Applicative<F, C>
): <Z>(A: Associative<Z>) => Applicative<F, Erase<C, Auto> & FixE<Z>>
```

Added in v1.0.0
