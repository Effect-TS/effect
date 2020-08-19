---
title: Prelude/index.ts
nav_order: 32
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [And](#and)
  - [AndF](#andf)
  - [Any](#any)
  - [Applicative](#applicative)
  - [AssociativeBoth](#associativeboth)
  - [AssociativeEither](#associativeeither)
  - [AssociativeFlatten](#associativeflatten)
  - [Auto](#auto)
  - [Base](#base)
  - [BooleanProd](#booleanprod)
  - [BooleanSum](#booleansum)
  - [Commutative](#commutative)
  - [CommutativeBoth](#commutativeboth)
  - [CommutativeEither](#commutativeeither)
  - [CommutativeURI](#commutativeuri)
  - [CompositionBase2](#compositionbase2)
  - [Contravariant](#contravariant)
  - [Covariant](#covariant)
  - [CovariantComposition](#covariantcomposition)
  - [Derive](#derive)
  - [F\_](#f_)
  - [F\_\_](#f__)
  - [F\_\_\_](#f___)
  - [F\_\_\_\_](#f____)
  - [Failure](#failure)
  - [FailureIn](#failurein)
  - [FailureOut](#failureout)
  - [First](#first)
  - [FixE](#fixe)
  - [FixI](#fixi)
  - [FixK](#fixk)
  - [FixN](#fixn)
  - [FixR](#fixr)
  - [FixS](#fixs)
  - [FixX](#fixx)
  - [Foreach](#foreach)
  - [ForeachComposition](#foreachcomposition)
  - [G\_](#g_)
  - [Generic](#generic)
  - [HKTFull](#hktfull)
  - [HKTFullURI](#hktfulluri)
  - [IdentityBoth](#identityboth)
  - [IdentityEither](#identityeither)
  - [IdentityFlatten](#identityflatten)
  - [Kind](#kind)
  - [Last](#last)
  - [Max](#max)
  - [Min](#min)
  - [Monad](#monad)
  - [None](#none)
  - [Or](#or)
  - [OrE](#ore)
  - [OrF](#orf)
  - [OrI](#ori)
  - [OrK](#ork)
  - [OrN](#orn)
  - [OrR](#orr)
  - [OrS](#ors)
  - [OrX](#orx)
  - [Prod](#prod)
  - [StringSum](#stringsum)
  - [Sum](#sum)
  - [Traversable](#traversable)
  - [TraversableComposition](#traversablecomposition)
  - [TypeOf](#typeof)
  - [UF\_](#uf_)
  - [UF\_\_](#uf__)
  - [UF\_\_\_](#uf___)
  - [UF\_\_\_\_](#uf____)
  - [UG\_](#ug_)
  - [URIS](#uris)
  - [URItoKind](#uritokind)
  - [genericDef](#genericdef)
  - [getContravariantComposition](#getcontravariantcomposition)
  - [getCovariantComposition](#getcovariantcomposition)
  - [getTraversableComposition](#gettraversablecomposition)
  - [implementForeachF](#implementforeachf)
  - [instance](#instance)
  - [makeCommutative](#makecommutative)
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

## Any

**Signature**

```ts
export declare const Any: any
```

Added in v1.0.0

## Applicative

**Signature**

```ts
export declare const Applicative: any
```

Added in v1.0.0

## AssociativeBoth

**Signature**

```ts
export declare const AssociativeBoth: any
```

Added in v1.0.0

## AssociativeEither

**Signature**

```ts
export declare const AssociativeEither: any
```

Added in v1.0.0

## AssociativeFlatten

**Signature**

```ts
export declare const AssociativeFlatten: any
```

Added in v1.0.0

## Auto

**Signature**

```ts
export declare const Auto: any
```

Added in v1.0.0

## Base

**Signature**

```ts
export declare const Base: any
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

## Commutative

**Signature**

```ts
export declare const Commutative: any
```

Added in v1.0.0

## CommutativeBoth

**Signature**

```ts
export declare const CommutativeBoth: any
```

Added in v1.0.0

## CommutativeEither

**Signature**

```ts
export declare const CommutativeEither: any
```

Added in v1.0.0

## CommutativeURI

**Signature**

```ts
export declare const CommutativeURI: 'Commutative'
```

Added in v1.0.0

## CompositionBase2

**Signature**

```ts
export declare const CompositionBase2: any
```

Added in v1.0.0

## Contravariant

**Signature**

```ts
export declare const Contravariant: any
```

Added in v1.0.0

## Covariant

**Signature**

```ts
export declare const Covariant: any
```

Added in v1.0.0

## CovariantComposition

**Signature**

```ts
export declare const CovariantComposition: any
```

Added in v1.0.0

## Derive

**Signature**

```ts
export declare const Derive: any
```

Added in v1.0.0

## F\_

**Signature**

```ts
export declare const F_: any
```

Added in v1.0.0

## F\_\_

**Signature**

```ts
export declare const F__: any
```

Added in v1.0.0

## F\_\_\_

**Signature**

```ts
export declare const F___: any
```

Added in v1.0.0

## F\_\_\_\_

**Signature**

```ts
export declare const F____: any
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

## Foreach

**Signature**

```ts
export declare const Foreach: any
```

Added in v1.0.0

## ForeachComposition

**Signature**

```ts
export declare const ForeachComposition: any
```

Added in v1.0.0

## G\_

**Signature**

```ts
export declare const G_: any
```

Added in v1.0.0

## Generic

**Signature**

```ts
export declare const Generic: any
```

Added in v1.0.0

## HKTFull

**Signature**

```ts
export declare const HKTFull: any
```

Added in v1.0.0

## HKTFullURI

**Signature**

```ts
export declare const HKTFullURI: 'HKTFullURI'
```

Added in v1.0.0

## IdentityBoth

**Signature**

```ts
export declare const IdentityBoth: any
```

Added in v1.0.0

## IdentityEither

**Signature**

```ts
export declare const IdentityEither: any
```

Added in v1.0.0

## IdentityFlatten

**Signature**

```ts
export declare const IdentityFlatten: any
```

Added in v1.0.0

## Kind

**Signature**

```ts
export declare const Kind: any
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

## Monad

**Signature**

```ts
export declare const Monad: any
```

Added in v1.0.0

## None

**Signature**

```ts
export declare const None: any
```

Added in v1.0.0

## Or

**Signature**

```ts
export declare const Or: ConstructorK<boolean, '@newtype/Or', Or>
```

Added in v1.0.0

## OrE

**Signature**

```ts
export declare const OrE: any
```

Added in v1.0.0

## OrF

**Signature**

```ts
export declare const OrF: GenericConstructor<'@newtype/OrF'>
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

## Traversable

**Signature**

```ts
export declare const Traversable: any
```

Added in v1.0.0

## TraversableComposition

**Signature**

```ts
export declare const TraversableComposition: any
```

Added in v1.0.0

## TypeOf

**Signature**

```ts
export declare const TypeOf: any
```

Added in v1.0.0

## UF\_

**Signature**

```ts
export declare const UF_: 'F_'
```

Added in v1.0.0

## UF\_\_

**Signature**

```ts
export declare const UF__: 'F__'
```

Added in v1.0.0

## UF\_\_\_

**Signature**

```ts
export declare const UF___: 'F___'
```

Added in v1.0.0

## UF\_\_\_\_

**Signature**

```ts
export declare const UF____: 'F____'
```

Added in v1.0.0

## UG\_

**Signature**

```ts
export declare const UG_: 'G_'
```

Added in v1.0.0

## URIS

**Signature**

```ts
export declare const URIS: any
```

Added in v1.0.0

## URItoKind

**Signature**

```ts
export declare const URItoKind: any
```

Added in v1.0.0

## genericDef

**Signature**

```ts
export declare const genericDef: typeof genericDef
```

Added in v1.0.0

## getContravariantComposition

**Signature**

```ts
export declare const getContravariantComposition: typeof getContravariantComposition
```

Added in v1.0.0

## getCovariantComposition

**Signature**

```ts
export declare const getCovariantComposition: typeof getCovariantComposition
```

Added in v1.0.0

## getTraversableComposition

**Signature**

```ts
export declare const getTraversableComposition: typeof getTraversableComposition
```

Added in v1.0.0

## implementForeachF

**Signature**

```ts
export declare const implementForeachF: typeof implementForeachF
```

Added in v1.0.0

## instance

**Signature**

```ts
export declare const instance: <T>(_: Pick<T, Exclude<keyof T, Ignores>>) => T
```

Added in v1.0.0

## makeCommutative

**Signature**

```ts
export declare const makeCommutative: <A>(f: (r: A) => (l: A) => A) => Commutative<A>
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
