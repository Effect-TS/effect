---
title: Classic/Either/index.ts
nav_order: 5
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Any](#any)
  - [Applicative](#applicative)
  - [AssociativeBoth](#associativeboth)
  - [AssociativeEither](#associativeeither)
  - [AssociativeFlatten](#associativeflatten)
  - [Covariant](#covariant)
  - [Either](#either)
  - [EitherURI](#eitheruri)
  - [EitherURI (type alias)](#eitheruri-type-alias)
  - [Left](#left)
  - [Monad](#monad)
  - [Right](#right)
  - [Traversable](#traversable)
  - [alt](#alt)
  - [alt\_](#alt_)
  - [ap](#ap)
  - [ap\_](#ap_)
  - [bimap](#bimap)
  - [bimap\_](#bimap_)
  - [chain](#chain)
  - [chain\_](#chain_)
  - [compact](#compact)
  - [duplicate](#duplicate)
  - [exists](#exists)
  - [exists\_](#exists_)
  - [extend](#extend)
  - [extend\_](#extend_)
  - [filterOrElse](#filterorelse)
  - [filterOrElse\_](#filterorelse_)
  - [flatten](#flatten)
  - [fold](#fold)
  - [fold\_](#fold_)
  - [foreachF](#foreachf)
  - [fromNullable](#fromnullable)
  - [fromNullable\_](#fromnullable_)
  - [fromOption](#fromoption)
  - [fromOption\_](#fromoption_)
  - [fromPredicate](#frompredicate)
  - [fromPredicate\_](#frompredicate_)
  - [getOrElse](#getorelse)
  - [getOrElse\_](#getorelse_)
  - [getValidationApplicative](#getvalidationapplicative)
  - [isLeft](#isleft)
  - [isRight](#isright)
  - [left](#left)
  - [map](#map)
  - [mapLeft](#mapleft)
  - [mapLeft\_](#mapleft_)
  - [map\_](#map_)
  - [merge](#merge)
  - [orElse](#orelse)
  - [orElseEither](#orelseeither)
  - [orElseEither\_](#orelseeither_)
  - [orElse\_](#orelse_)
  - [parseJSON](#parsejson)
  - [parseJSON\_](#parsejson_)
  - [right](#right)
  - [stringifyJSON](#stringifyjson)
  - [swap](#swap)
  - [tap](#tap)
  - [tap\_](#tap_)
  - [toError](#toerror)
  - [tryCatch](#trycatch)
  - [tryCatch\_](#trycatch_)
  - [widenA](#widena)
  - [widenE](#widene)
  - [zip](#zip)
  - [zipFirst](#zipfirst)
  - [zipFirst\_](#zipfirst_)
  - [zipSecond](#zipsecond)
  - [zipSecond\_](#zipsecond_)
  - [zipValidation](#zipvalidation)
  - [zip\_](#zip_)

---

# utils

## Any

**Signature**

```ts
export declare const Any: P.Any<'EitherURI', P.Auto>
```

Added in v1.0.0

## Applicative

**Signature**

```ts
export declare const Applicative: P.Applicative<'EitherURI', P.Auto>
```

Added in v1.0.0

## AssociativeBoth

**Signature**

```ts
export declare const AssociativeBoth: P.AssociativeBoth<'EitherURI', P.Auto>
```

Added in v1.0.0

## AssociativeEither

**Signature**

```ts
export declare const AssociativeEither: P.AssociativeEither<'EitherURI', P.Auto>
```

Added in v1.0.0

## AssociativeFlatten

**Signature**

```ts
export declare const AssociativeFlatten: P.AssociativeFlatten<'EitherURI', P.Auto>
```

Added in v1.0.0

## Covariant

**Signature**

```ts
export declare const Covariant: P.Covariant<'EitherURI', P.Auto>
```

Added in v1.0.0

## Either

**Signature**

```ts
export declare const Either: any
```

Added in v1.0.0

## EitherURI

**Signature**

```ts
export declare const EitherURI: 'EitherURI'
```

Added in v1.0.0

## EitherURI (type alias)

**Signature**

```ts
export type EitherURI = typeof EitherURI
```

Added in v1.0.0

## Left

**Signature**

```ts
export declare const Left: any
```

Added in v1.0.0

## Monad

**Signature**

```ts
export declare const Monad: P.Monad<'EitherURI', P.Auto>
```

Added in v1.0.0

## Right

**Signature**

```ts
export declare const Right: any
```

Added in v1.0.0

## Traversable

**Signature**

```ts
export declare const Traversable: P.Traversable<'EitherURI', P.Auto>
```

Added in v1.0.0

## alt

**Signature**

```ts
export declare const alt: any
```

Added in v1.0.0

## alt\_

**Signature**

```ts
export declare const alt_: any
```

Added in v1.0.0

## ap

**Signature**

```ts
export declare const ap: any
```

Added in v1.0.0

## ap\_

**Signature**

```ts
export declare const ap_: any
```

Added in v1.0.0

## bimap

**Signature**

```ts
export declare const bimap: any
```

Added in v1.0.0

## bimap\_

**Signature**

```ts
export declare const bimap_: any
```

Added in v1.0.0

## chain

**Signature**

```ts
export declare const chain: any
```

Added in v1.0.0

## chain\_

**Signature**

```ts
export declare const chain_: any
```

Added in v1.0.0

## compact

**Signature**

```ts
export declare const compact: any
```

Added in v1.0.0

## duplicate

**Signature**

```ts
export declare const duplicate: any
```

Added in v1.0.0

## exists

**Signature**

```ts
export declare const exists: any
```

Added in v1.0.0

## exists\_

**Signature**

```ts
export declare const exists_: any
```

Added in v1.0.0

## extend

**Signature**

```ts
export declare const extend: any
```

Added in v1.0.0

## extend\_

**Signature**

```ts
export declare const extend_: any
```

Added in v1.0.0

## filterOrElse

**Signature**

```ts
export declare const filterOrElse: any
```

Added in v1.0.0

## filterOrElse\_

**Signature**

```ts
export declare const filterOrElse_: any
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

## fold

**Signature**

```ts
export declare const fold: any
```

Added in v1.0.0

## fold\_

**Signature**

```ts
export declare const fold_: any
```

Added in v1.0.0

## foreachF

**Signature**

```ts
export declare const foreachF: P.Foreach<'EitherURI', P.Auto>
```

Added in v1.0.0

## fromNullable

**Signature**

```ts
export declare const fromNullable: any
```

Added in v1.0.0

## fromNullable\_

**Signature**

```ts
export declare const fromNullable_: any
```

Added in v1.0.0

## fromOption

**Signature**

```ts
export declare const fromOption: any
```

Added in v1.0.0

## fromOption\_

**Signature**

```ts
export declare const fromOption_: any
```

Added in v1.0.0

## fromPredicate

**Signature**

```ts
export declare const fromPredicate: any
```

Added in v1.0.0

## fromPredicate\_

**Signature**

```ts
export declare const fromPredicate_: any
```

Added in v1.0.0

## getOrElse

**Signature**

```ts
export declare const getOrElse: any
```

Added in v1.0.0

## getOrElse\_

**Signature**

```ts
export declare const getOrElse_: any
```

Added in v1.0.0

## getValidationApplicative

**Signature**

```ts
export declare const getValidationApplicative: <Z>(A: Associative<Z>) => P.Applicative<'EitherURI', any>
```

Added in v1.0.0

## isLeft

**Signature**

```ts
export declare const isLeft: any
```

Added in v1.0.0

## isRight

**Signature**

```ts
export declare const isRight: any
```

Added in v1.0.0

## left

**Signature**

```ts
export declare const left: any
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapLeft

**Signature**

```ts
export declare const mapLeft: any
```

Added in v1.0.0

## mapLeft\_

**Signature**

```ts
export declare const mapLeft_: any
```

Added in v1.0.0

## map\_

**Signature**

```ts
export declare const map_: any
```

Added in v1.0.0

## merge

**Signature**

```ts
export declare const merge: any
```

Added in v1.0.0

## orElse

**Signature**

```ts
export declare const orElse: any
```

Added in v1.0.0

## orElseEither

**Signature**

```ts
export declare const orElseEither: any
```

Added in v1.0.0

## orElseEither\_

**Signature**

```ts
export declare const orElseEither_: any
```

Added in v1.0.0

## orElse\_

**Signature**

```ts
export declare const orElse_: any
```

Added in v1.0.0

## parseJSON

**Signature**

```ts
export declare const parseJSON: any
```

Added in v1.0.0

## parseJSON\_

**Signature**

```ts
export declare const parseJSON_: any
```

Added in v1.0.0

## right

**Signature**

```ts
export declare const right: any
```

Added in v1.0.0

## stringifyJSON

**Signature**

```ts
export declare const stringifyJSON: any
```

Added in v1.0.0

## swap

**Signature**

```ts
export declare const swap: any
```

Added in v1.0.0

## tap

**Signature**

```ts
export declare const tap: any
```

Added in v1.0.0

## tap\_

**Signature**

```ts
export declare const tap_: any
```

Added in v1.0.0

## toError

**Signature**

```ts
export declare const toError: any
```

Added in v1.0.0

## tryCatch

**Signature**

```ts
export declare const tryCatch: any
```

Added in v1.0.0

## tryCatch\_

**Signature**

```ts
export declare const tryCatch_: any
```

Added in v1.0.0

## widenA

**Signature**

```ts
export declare const widenA: any
```

Added in v1.0.0

## widenE

**Signature**

```ts
export declare const widenE: any
```

Added in v1.0.0

## zip

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipFirst

**Signature**

```ts
export declare const zipFirst: any
```

Added in v1.0.0

## zipFirst\_

**Signature**

```ts
export declare const zipFirst_: any
```

Added in v1.0.0

## zipSecond

**Signature**

```ts
export declare const zipSecond: any
```

Added in v1.0.0

## zipSecond\_

**Signature**

```ts
export declare const zipSecond_: any
```

Added in v1.0.0

## zipValidation

**Signature**

```ts
export declare function zipValidation<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]>
```

Added in v1.0.0

## zip\_

**Signature**

```ts
export declare const zip_: any
```

Added in v1.0.0
