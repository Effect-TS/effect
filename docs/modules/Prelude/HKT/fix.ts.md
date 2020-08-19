---
title: Prelude/HKT/fix.ts
nav_order: 29
parent: Modules
---

## fix overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [FixE](#fixe)
  - [FixE (interface)](#fixe-interface)
  - [FixI](#fixi)
  - [FixI (interface)](#fixi-interface)
  - [FixK](#fixk)
  - [FixK (interface)](#fixk-interface)
  - [FixN](#fixn)
  - [FixN (interface)](#fixn-interface)
  - [FixR](#fixr)
  - [FixR (interface)](#fixr-interface)
  - [FixS](#fixs)
  - [FixS (interface)](#fixs-interface)
  - [FixX](#fixx)
  - [FixX (interface)](#fixx-interface)
  - [OrE (type alias)](#ore-type-alias)
  - [OrI (type alias)](#ori-type-alias)
  - [OrK (type alias)](#ork-type-alias)
  - [OrN (type alias)](#orn-type-alias)
  - [OrR (type alias)](#orr-type-alias)
  - [OrS (type alias)](#ors-type-alias)
  - [OrX (type alias)](#orx-type-alias)

---

# utils

## FixE

**Signature**

```ts
export declare const FixE: GenericConstructor<'@newtype/FixE'>
```

Added in v1.0.0

## FixE (interface)

**Signature**

```ts
export interface FixE<F> extends Generic<F, typeof FixE> {}
```

Added in v1.0.0

## FixI

**Signature**

```ts
export declare const FixI: GenericConstructor<'@newtype/FixI'>
```

Added in v1.0.0

## FixI (interface)

**Signature**

```ts
export interface FixI<F> extends Generic<F, typeof FixI> {}
```

Added in v1.0.0

## FixK

**Signature**

```ts
export declare const FixK: GenericConstructor<'@newtype/FixK'>
```

Added in v1.0.0

## FixK (interface)

**Signature**

```ts
export interface FixK<F> extends Generic<F, typeof FixK> {}
```

Added in v1.0.0

## FixN

**Signature**

```ts
export declare const FixN: GenericConstructor<'@newtype/FixN'>
```

Added in v1.0.0

## FixN (interface)

**Signature**

```ts
export interface FixN<F extends string> extends Generic<F, typeof FixK> {}
```

Added in v1.0.0

## FixR

**Signature**

```ts
export declare const FixR: GenericConstructor<'@newtype/FixR'>
```

Added in v1.0.0

## FixR (interface)

**Signature**

```ts
export interface FixR<F> extends Generic<F, typeof FixR> {}
```

Added in v1.0.0

## FixS

**Signature**

```ts
export declare const FixS: GenericConstructor<'@newtype/FixS'>
```

Added in v1.0.0

## FixS (interface)

**Signature**

```ts
export interface FixS<F> extends Generic<F, typeof FixS> {}
```

Added in v1.0.0

## FixX

**Signature**

```ts
export declare const FixX: GenericConstructor<'@newtype/FixX'>
```

Added in v1.0.0

## FixX (interface)

**Signature**

```ts
export interface FixX<F> extends Generic<F, typeof FixX> {}
```

Added in v1.0.0

## OrE (type alias)

**Signature**

```ts
export type OrE<A, B> = A extends FixE<infer X> ? X : B
```

Added in v1.0.0

## OrI (type alias)

**Signature**

```ts
export type OrI<A, B> = A extends FixI<infer X> ? X : B
```

Added in v1.0.0

## OrK (type alias)

**Signature**

```ts
export type OrK<A, B> = A extends FixK<infer X> ? X : B
```

Added in v1.0.0

## OrN (type alias)

**Signature**

```ts
export type OrN<A, B> = A extends FixN<infer X> ? X : B
```

Added in v1.0.0

## OrR (type alias)

**Signature**

```ts
export type OrR<A, B> = A extends FixR<infer X> ? X : B
```

Added in v1.0.0

## OrS (type alias)

**Signature**

```ts
export type OrS<A, B> = A extends FixS<infer X> ? X : B
```

Added in v1.0.0

## OrX (type alias)

**Signature**

```ts
export type OrX<A, B> = A extends FixX<infer X> ? X : B
```

Added in v1.0.0
