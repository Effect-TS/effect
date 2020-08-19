---
title: Prelude/HKT/index.ts
nav_order: 30
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Auto (interface)](#auto-interface)
  - [Base (interface)](#base-interface)
  - [CompositionBase2 (interface)](#compositionbase2-interface)
  - [F\_ (interface)](#f_-interface)
  - [F\_\_ (interface)](#f__-interface)
  - [F\_\_\_ (interface)](#f___-interface)
  - [F\_\_\_\_ (interface)](#f____-interface)
  - [FixE](#fixe)
  - [FixI](#fixi)
  - [FixK](#fixk)
  - [FixN](#fixn)
  - [FixR](#fixr)
  - [FixS](#fixs)
  - [FixX](#fixx)
  - [G\_ (interface)](#g_-interface)
  - [HKTFull (interface)](#hktfull-interface)
  - [HKTFullURI](#hktfulluri)
  - [HKTFullURI (type alias)](#hktfulluri-type-alias)
  - [Kind (type alias)](#kind-type-alias)
  - [OrE](#ore)
  - [OrI](#ori)
  - [OrK](#ork)
  - [OrN](#orn)
  - [OrR](#orr)
  - [OrS](#ors)
  - [OrX](#orx)
  - [UF\_](#uf_)
  - [UF\_ (type alias)](#uf_-type-alias)
  - [UF\_\_](#uf__)
  - [UF\_\_ (type alias)](#uf__-type-alias)
  - [UF\_\_\_](#uf___)
  - [UF\_\_\_ (type alias)](#uf___-type-alias)
  - [UF\_\_\_\_](#uf____)
  - [UF\_\_\_\_ (type alias)](#uf____-type-alias)
  - [UG\_](#ug_)
  - [UG\_ (type alias)](#ug_-type-alias)
  - [URIS (type alias)](#uris-type-alias)
  - [URItoKind (interface)](#uritokind-interface)
  - [instance](#instance)

---

# utils

## Auto (interface)

**Signature**

```ts
export interface Auto {
  readonly Auto: unique symbol
}
```

Added in v1.0.0

## Base (interface)

**Signature**

```ts
export interface Base<F> {
  F: F
}
```

Added in v1.0.0

## CompositionBase2 (interface)

**Signature**

```ts
export interface CompositionBase2<F, G> {
  F: F
  G: G
}
```

Added in v1.0.0

## F\_ (interface)

**Signature**

```ts
export interface F_<A> {
  URI: UF_
  A: A
}
```

Added in v1.0.0

## F\_\_ (interface)

**Signature**

```ts
export interface F__<E, A> {
  URI: UF__
  E: E
  A: A
}
```

Added in v1.0.0

## F\_\_\_ (interface)

**Signature**

```ts
export interface F___<R, E, A> {
  URI: UF___
  E: E
  A: A
  R: R
}
```

Added in v1.0.0

## F\_\_\_\_ (interface)

**Signature**

```ts
export interface F____<S, R, E, A> {
  URI: UF____
  E: E
  A: A
  R: R
  S: S
}
```

Added in v1.0.0

## FixE

**Signature**

```ts
export declare const FixE: GenericConstructor<'@newtype/FixE'>
```

Added in v1.0.0

## FixI

**Signature**

```ts
export declare const FixI: GenericConstructor<'@newtype/FixI'>
```

Added in v1.0.0

## FixK

**Signature**

```ts
export declare const FixK: GenericConstructor<'@newtype/FixK'>
```

Added in v1.0.0

## FixN

**Signature**

```ts
export declare const FixN: GenericConstructor<'@newtype/FixN'>
```

Added in v1.0.0

## FixR

**Signature**

```ts
export declare const FixR: GenericConstructor<'@newtype/FixR'>
```

Added in v1.0.0

## FixS

**Signature**

```ts
export declare const FixS: GenericConstructor<'@newtype/FixS'>
```

Added in v1.0.0

## FixX

**Signature**

```ts
export declare const FixX: GenericConstructor<'@newtype/FixX'>
```

Added in v1.0.0

## G\_ (interface)

**Signature**

```ts
export interface G_<A> {
  URI: UG_
  A: A
}
```

Added in v1.0.0

## HKTFull (interface)

**Signature**

```ts
export interface HKTFull<K, SI, SO, X, I, S, R, E, A> {
  URI: HKTFullURI
  K: () => K
  SI: (_: SI) => void
  SO: () => SO
  X: () => X
  I: (_: I) => void
  S: S
  R: (_: R) => void
  E: () => E
  A: A
}
```

Added in v1.0.0

## HKTFullURI

**Signature**

```ts
export declare const HKTFullURI: 'HKTFullURI'
```

Added in v1.0.0

## HKTFullURI (type alias)

**Signature**

```ts
export type HKTFullURI = typeof HKTFullURI
```

Added in v1.0.0

## Kind (type alias)

**Signature**

```ts
export type Kind<URI extends URIS, N extends string, K, SI, SO, X, I, S, R, E, A> = URI extends URIS
  ? URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI]
  : never
```

Added in v1.0.0

## OrE

**Signature**

```ts
export declare const OrE: any
```

Added in v1.0.0

## OrI

**Signature**

```ts
export declare const OrI: any
```

Added in v1.0.0

## OrK

**Signature**

```ts
export declare const OrK: any
```

Added in v1.0.0

## OrN

**Signature**

```ts
export declare const OrN: any
```

Added in v1.0.0

## OrR

**Signature**

```ts
export declare const OrR: any
```

Added in v1.0.0

## OrS

**Signature**

```ts
export declare const OrS: any
```

Added in v1.0.0

## OrX

**Signature**

```ts
export declare const OrX: any
```

Added in v1.0.0

## UF\_

**Signature**

```ts
export declare const UF_: 'F_'
```

Added in v1.0.0

## UF\_ (type alias)

**Signature**

```ts
export type UF_ = typeof UF_
```

Added in v1.0.0

## UF\_\_

**Signature**

```ts
export declare const UF__: 'F__'
```

Added in v1.0.0

## UF\_\_ (type alias)

**Signature**

```ts
export type UF__ = typeof UF__
```

Added in v1.0.0

## UF\_\_\_

**Signature**

```ts
export declare const UF___: 'F___'
```

Added in v1.0.0

## UF\_\_\_ (type alias)

**Signature**

```ts
export type UF___ = typeof UF___
```

Added in v1.0.0

## UF\_\_\_\_

**Signature**

```ts
export declare const UF____: 'F____'
```

Added in v1.0.0

## UF\_\_\_\_ (type alias)

**Signature**

```ts
export type UF____ = typeof UF____
```

Added in v1.0.0

## UG\_

**Signature**

```ts
export declare const UG_: 'G_'
```

Added in v1.0.0

## UG\_ (type alias)

**Signature**

```ts
export type UG_ = typeof UG_
```

Added in v1.0.0

## URIS (type alias)

**Signature**

```ts
export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any, any>
```

Added in v1.0.0

## URItoKind (interface)

**Signature**

```ts
export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
  [UF_]: F_<A>
  [UG_]: G_<A>
  [UF__]: F__<E, A>
  [UF___]: F___<R, E, A>
  [UF____]: F____<S, R, E, A>
}
```

Added in v1.0.0

## instance

**Signature**

```ts
export declare const instance: <T>(_: Pick<T, Exclude<keyof T, Ignores>>) => T
```

Added in v1.0.0
