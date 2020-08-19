---
title: Prelude/Newtype/index.ts
nav_order: 34
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [And](#and)
  - [AndF](#andf)
  - [BooleanProd](#booleanprod)
  - [BooleanSum](#booleansum)
  - [Failure](#failure)
  - [FailureIn](#failurein)
  - [FailureOut](#failureout)
  - [First](#first)
  - [Generic](#generic)
  - [Last](#last)
  - [Max](#max)
  - [Min](#min)
  - [Or](#or)
  - [OrF](#orf)
  - [Prod](#prod)
  - [StringSum](#stringsum)
  - [Sum](#sum)
  - [TypeOf](#typeof)
  - [genericDef](#genericdef)
  - [newtype](#newtype)
  - [typeDef](#typedef)

---

# utils

## And

**Signature**

```ts
export declare const And: ConstructorK<boolean, '@newtype/And', And>
```

Added in v1.0.0

## AndF

**Signature**

```ts
export declare const AndF: GenericConstructor<'@newtype/AndF'>
```

Added in v1.0.0

## BooleanProd

**Signature**

```ts
export declare const BooleanProd: Constructor<boolean, '@newtype/Prod'>
```

Added in v1.0.0

## BooleanSum

**Signature**

```ts
export declare const BooleanSum: Constructor<boolean, '@newtype/Sum'>
```

Added in v1.0.0

## Failure

**Signature**

```ts
export declare const Failure: GenericConstructor<'@newtype/Failure'>
```

Added in v1.0.0

## FailureIn

**Signature**

```ts
export declare const FailureIn: GenericConstructor<'@newtype/FailureIn'>
```

Added in v1.0.0

## FailureOut

**Signature**

```ts
export declare const FailureOut: GenericConstructor<'@newtype/FailureOut'>
```

Added in v1.0.0

## First

**Signature**

```ts
export declare const First: GenericConstructor<'@newtype/First'>
```

Added in v1.0.0

## Generic

**Signature**

```ts
export declare const Generic: any
```

Added in v1.0.0

## Last

**Signature**

```ts
export declare const Last: GenericConstructor<'@newtype/Last'>
```

Added in v1.0.0

## Max

**Signature**

```ts
export declare const Max: GenericConstructor<'@newtype/Max'>
```

Added in v1.0.0

## Min

**Signature**

```ts
export declare const Min: GenericConstructor<'@newtype/Min'>
```

Added in v1.0.0

## Or

**Signature**

```ts
export declare const Or: ConstructorK<boolean, '@newtype/Or', Or>
```

Added in v1.0.0

## OrF

**Signature**

```ts
export declare const OrF: GenericConstructor<'@newtype/OrF'>
```

Added in v1.0.0

## Prod

**Signature**

```ts
export declare const Prod: GenericConstructor<'@newtype/Prod'>
```

Added in v1.0.0

## StringSum

**Signature**

```ts
export declare const StringSum: Constructor<string, '@newtype/Sum'>
```

Added in v1.0.0

## Sum

**Signature**

```ts
export declare const Sum: GenericConstructor<'@newtype/Sum'>
```

Added in v1.0.0

## TypeOf

**Signature**

```ts
export declare const TypeOf: any
```

Added in v1.0.0

## genericDef

**Signature**

```ts
export declare const genericDef: typeof genericDef
```

Added in v1.0.0

## newtype

**Signature**

```ts
export declare const newtype: <K extends Newtype<any, any>>() => (
  _: Constructor<K['_A'], K['_URI']>
) => ConstructorK<K['_A'], K['_URI'], K>
```

Added in v1.0.0

## typeDef

**Signature**

```ts
export declare const typeDef: typeof typeDef
```

Added in v1.0.0
