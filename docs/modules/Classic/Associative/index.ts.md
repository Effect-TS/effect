---
title: Classic/Associative/index.ts
nav_order: 2
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Associative (interface)](#associative-interface)
  - [makeAssociative](#makeassociative)

---

# utils

## Associative (interface)

The `Associative[A]` type class describes an associative binary operator
for a type `A`. For example, addition for integers, and string
concatenation for strings.

**Signature**

```ts
export interface Associative<A> extends Closure<A> {}
```

Added in v1.0.0

## makeAssociative

**Signature**

```ts
export declare const makeAssociative: <A>(f: (r: A) => (l: A) => A) => Associative<A>
```

Added in v1.0.0
