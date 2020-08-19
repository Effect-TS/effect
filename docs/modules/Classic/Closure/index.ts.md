---
title: Classic/Closure/index.ts
nav_order: 3
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Closure (interface)](#closure-interface)
  - [ClosureURI](#closureuri)
  - [ClosureURI (type alias)](#closureuri-type-alias)
  - [makeClosure](#makeclosure)

---

# utils

## Closure (interface)

Base combine

**Signature**

```ts
export interface Closure<A> {
  combine(r: A): (l: A) => A
}
```

Added in v1.0.0

## ClosureURI

**Signature**

```ts
export declare const ClosureURI: 'Closure'
```

Added in v1.0.0

## ClosureURI (type alias)

**Signature**

```ts
export type ClosureURI = typeof ClosureURI
```

Added in v1.0.0

## makeClosure

**Signature**

```ts
export declare const makeClosure: <A>(f: (l: A, r: A) => A) => Closure<A>
```

Added in v1.0.0
