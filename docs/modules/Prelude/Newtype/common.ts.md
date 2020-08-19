---
title: Prelude/Newtype/common.ts
nav_order: 33
parent: Modules
---

## common overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [And](#and)
  - [And (interface)](#and-interface)
  - [AndF](#andf)
  - [AndF (interface)](#andf-interface)
  - [BooleanProd](#booleanprod)
  - [BooleanSum](#booleansum)
  - [Failure](#failure)
  - [Failure (interface)](#failure-interface)
  - [FailureIn](#failurein)
  - [FailureIn (interface)](#failurein-interface)
  - [FailureOut](#failureout)
  - [FailureOut (interface)](#failureout-interface)
  - [First](#first)
  - [First (interface)](#first-interface)
  - [Last](#last)
  - [Last (interface)](#last-interface)
  - [Max](#max)
  - [Max (interface)](#max-interface)
  - [Min](#min)
  - [Min (interface)](#min-interface)
  - [Or](#or)
  - [Or (interface)](#or-interface)
  - [OrF](#orf)
  - [OrF (interface)](#orf-interface)
  - [Prod](#prod)
  - [Prod (interface)](#prod-interface)
  - [StringSum](#stringsum)
  - [Sum](#sum)
  - [Sum (interface)](#sum-interface)

---

# utils

## And

**Signature**

```ts
export declare const And: ConstructorK<boolean, '@newtype/And', And>
```

Added in v1.0.0

## And (interface)

**Signature**

```ts
export interface And extends TypeOf<typeof And_> {}
```

Added in v1.0.0

## AndF

A newtype representing parameterized logical conjunction.

**Signature**

```ts
export declare const AndF: GenericConstructor<'@newtype/AndF'>
```

Added in v1.0.0

## AndF (interface)

**Signature**

```ts
export interface AndF<A> extends Generic<A, typeof AndF> {}
```

Added in v1.0.0

## BooleanProd

A newtype representing a Boolean Product

**Signature**

```ts
export declare const BooleanProd: Constructor<boolean, '@newtype/Prod'>
```

Added in v1.0.0

## BooleanSum

A newtype representing a Boolean Sum

**Signature**

```ts
export declare const BooleanSum: Constructor<boolean, '@newtype/Sum'>
```

Added in v1.0.0

## Failure

A newtype representing another type in a failed state

**Signature**

```ts
export declare const Failure: GenericConstructor<'@newtype/Failure'>
```

Added in v1.0.0

## Failure (interface)

**Signature**

```ts
export interface Failure<A> extends Generic<A, typeof Failure> {}
```

Added in v1.0.0

## FailureIn

A newtype representing an input error in another type

**Signature**

```ts
export declare const FailureIn: GenericConstructor<'@newtype/FailureIn'>
```

Added in v1.0.0

## FailureIn (interface)

**Signature**

```ts
export interface FailureIn<A> extends Generic<A, typeof FailureIn> {}
```

Added in v1.0.0

## FailureOut

A newtype representing an output error in another type

**Signature**

```ts
export declare const FailureOut: GenericConstructor<'@newtype/FailureOut'>
```

Added in v1.0.0

## FailureOut (interface)

**Signature**

```ts
export interface FailureOut<A> extends Generic<A, typeof FailureOut> {}
```

Added in v1.0.0

## First

A newtype representing taking the first of two elements.

**Signature**

```ts
export declare const First: GenericConstructor<'@newtype/First'>
```

Added in v1.0.0

## First (interface)

**Signature**

```ts
export interface First<A> extends Generic<A, typeof First> {}
```

Added in v1.0.0

## Last

A newtype representing taking the last of two elements.

**Signature**

```ts
export declare const Last: GenericConstructor<'@newtype/Last'>
```

Added in v1.0.0

## Last (interface)

**Signature**

```ts
export interface Last<A> extends Generic<A, typeof Last> {}
```

Added in v1.0.0

## Max

A newtype representing taking the max of two elements.

**Signature**

```ts
export declare const Max: GenericConstructor<'@newtype/Max'>
```

Added in v1.0.0

## Max (interface)

**Signature**

```ts
export interface Max<A> extends Generic<A, typeof Max> {}
```

Added in v1.0.0

## Min

A newtype representing taking the min of two elements.

**Signature**

```ts
export declare const Min: GenericConstructor<'@newtype/Min'>
```

Added in v1.0.0

## Min (interface)

**Signature**

```ts
export interface Min<A> extends Generic<A, typeof Min> {}
```

Added in v1.0.0

## Or

**Signature**

```ts
export declare const Or: ConstructorK<boolean, '@newtype/Or', Or>
```

Added in v1.0.0

## Or (interface)

**Signature**

```ts
export interface Or extends TypeOf<typeof Or_> {}
```

Added in v1.0.0

## OrF

A newtype representing parameterized logical disjunction.

**Signature**

```ts
export declare const OrF: GenericConstructor<'@newtype/OrF'>
```

Added in v1.0.0

## OrF (interface)

**Signature**

```ts
export interface OrF<A> extends Generic<A, typeof OrF> {}
```

Added in v1.0.0

## Prod

A newtype representing multiplication.

**Signature**

```ts
export declare const Prod: GenericConstructor<'@newtype/Prod'>
```

Added in v1.0.0

## Prod (interface)

**Signature**

```ts
export interface Prod<A> extends Generic<A, typeof Prod> {}
```

Added in v1.0.0

## StringSum

A newtype representing a String Sum

**Signature**

```ts
export declare const StringSum: Constructor<string, '@newtype/Sum'>
```

Added in v1.0.0

## Sum

A newtype representing addition.

**Signature**

```ts
export declare const Sum: GenericConstructor<'@newtype/Sum'>
```

Added in v1.0.0

## Sum (interface)

**Signature**

```ts
export interface Sum<A> extends Generic<A, typeof Sum> {}
```

Added in v1.0.0
