---
title: Classic/Equal/index.ts
nav_order: 6
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Any](#any)
  - [AssociativeBoth](#associativeboth)
  - [AssociativeEither](#associativeeither)
  - [Contravariant](#contravariant)
  - [Equal (interface)](#equal-interface)
  - [EqualURI](#equaluri)
  - [EqualURI (type alias)](#equaluri-type-alias)
  - [IdentityBoth](#identityboth)
  - [IdentityEither](#identityeither)
  - [None](#none)
  - [anyEqual](#anyequal)
  - [both](#both)
  - [contramap](#contramap)
  - [either](#either)
  - [eqArray](#eqarray)
  - [makeEqual](#makeequal)
  - [nothingEqual](#nothingequal)
  - [number](#number)
  - [strict](#strict)
  - [string](#string)
  - [symbol](#symbol)

---

# utils

## Any

The `Any` instance for `Equal`.

**Signature**

```ts
export declare const Any: P.Any<'Equal', P.Auto>
```

Added in v1.0.0

## AssociativeBoth

The `AssociativeBoth` instance for `Equal`.

**Signature**

```ts
export declare const AssociativeBoth: P.AssociativeBoth<'Equal', P.Auto>
```

Added in v1.0.0

## AssociativeEither

The `AssociativeEither` instance for `Equal`.

**Signature**

```ts
export declare const AssociativeEither: P.AssociativeEither<'Equal', P.Auto>
```

Added in v1.0.0

## Contravariant

The `Contravariant` instance for `Equal`.

**Signature**

```ts
export declare const Contravariant: P.Contravariant<'Equal', P.Auto>
```

Added in v1.0.0

## Equal (interface)

`Equal[A]` provides implicit evidence that two values of type `A` can be
compared for equality.

**Signature**

```ts
export interface Equal<A> {
  /**
   * Returns whether two values of type `A` are equal.
   */
  readonly equals: (y: A) => (x: A) => boolean
}
```

Added in v1.0.0

## EqualURI

**Signature**

```ts
export declare const EqualURI: 'Equal'
```

Added in v1.0.0

## EqualURI (type alias)

**Signature**

```ts
export type EqualURI = typeof EqualURI
```

Added in v1.0.0

## IdentityBoth

The `IdentityBoth` instance for `Equal`.

**Signature**

```ts
export declare const IdentityBoth: P.IdentityBoth<'Equal', P.Auto>
```

Added in v1.0.0

## IdentityEither

The `IdentityEither` instance for `Equal`.

**Signature**

```ts
export declare const IdentityEither: P.IdentityEither<'Equal', P.Auto>
```

Added in v1.0.0

## None

The `None` instance for `Equal`.

**Signature**

```ts
export declare const None: P.None<'Equal', P.Auto>
```

Added in v1.0.0

## anyEqual

Equality for `Any` values. Note that since values of type `Any` contain
no information, all values of type `Any` can be treated as equal to each
other.

**Signature**

```ts
export declare const anyEqual: Equal<unknown>
```

Added in v1.0.0

## both

Constructs an `Equal[(A, B)]` given an `Equal[A]` and `Equal[B]` by first
comparing the `A` values for equality and then comparing the `B` values
for equality, if necessary.

**Signature**

```ts
export declare function both<B>(fb: Equal<B>): <A>(fa: Equal<A>) => Equal<readonly [A, B]>
```

Added in v1.0.0

## contramap

Constructs an `Equal[B]` given an `Equal[A]` and a function `f` to
transform a `B` value into an `A` value. The instance will convert each
`B` value into an `A` and the compare the `A` values for equality.

**Signature**

```ts
export declare function contramap<A, B>(f: (a: B) => A): (fa: Equal<A>) => Equal<B>
```

Added in v1.0.0

## either

Constructs an `Equal[Either[A, B]]` given an `Equal[A]` and an
`Equal[B]`. The instance will compare the `Either[A, B]` values and if
both are `Right` or `Left` compare them for equality.

**Signature**

```ts
export declare function either<B>(fb: Equal<B>): <A>(fa: Equal<A>) => Equal<E.Either<A, B>>
```

Added in v1.0.0

## eqArray

Derives an `Equal[Array[A]]` given an `Equal[A]`.

**Signature**

```ts
export declare function eqArray<A>(EqA: Equal<A>): Equal<A.Array<A>>
```

Added in v1.0.0

## makeEqual

Constructs an `Equal[A]` from a function. The instance will be optimized
to first compare the values for reference equality and then compare the
values for value equality.

**Signature**

```ts
export declare function makeEqual<A>(f: (y: A) => (x: A) => boolean): Equal<A>
```

Added in v1.0.0

## nothingEqual

Equality for `Nothing` values. Note that since there are not values of
type `Nothing` the `equals` method of this instance can never be called
but it can be useful in deriving instances for more complex types.

**Signature**

```ts
export declare const nothingEqual: Equal<never>
```

Added in v1.0.0

## number

Equality for `number` values.

**Signature**

```ts
export declare const number: Equal<number>
```

Added in v1.0.0

## strict

Constructs an `Equal[A]` that uses the default notion of equality
embodied in the implementation of `equals` for values of type `A`.

**Signature**

```ts
export declare function strict<A>()
```

Added in v1.0.0

## string

Equality for `string` values.

**Signature**

```ts
export declare const string: Equal<string>
```

Added in v1.0.0

## symbol

Equality for `symbol` values.

**Signature**

```ts
export declare const symbol: Equal<symbol>
```

Added in v1.0.0
