---
title: Classic/Commutative/index.ts
nav_order: 4
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Commutative (interface)](#commutative-interface)
  - [CommutativeURI](#commutativeuri)
  - [CommutativeURI (type alias)](#commutativeuri-type-alias)
  - [makeCommutative](#makecommutative)

---

# utils

## Commutative (interface)

The `Commutative[A]` type class describes a commutative binary operator
for a type `A`. For example, addition for integers.

**Signature**

```ts
export interface Commutative<A> extends Associative<A> {
  readonly commute: (y: A) => (x: A) => A
}
```

Added in v1.0.0

## CommutativeURI

**Signature**

```ts
export declare const CommutativeURI: 'Commutative'
```

Added in v1.0.0

## CommutativeURI (type alias)

**Signature**

```ts
export type CommutativeURI = typeof CommutativeURI
```

Added in v1.0.0

## makeCommutative

**Signature**

```ts
export declare const makeCommutative: <A>(f: (r: A) => (l: A) => A) => Commutative<A>
```

Added in v1.0.0
