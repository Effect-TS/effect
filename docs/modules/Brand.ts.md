---
title: Brand.ts
nav_order: 4
parent: Modules
---

## Brand overview

This module provides types and utility functions to create and work with branded types,
which are TypeScript types with an added type tag to prevent accidental usage of a value in the wrong context.

The `refined` and `nominal` functions are both used to create branded types in TypeScript.
The main difference between them is that `refined` allows for validation of the data, while `nominal` does not.

The `nominal` function is used to create a new branded type that has the same underlying type as the input, but with a different name.
This is useful when you want to distinguish between two values of the same type that have different meanings.
The `nominal` function does not perform any validation of the input data.

On the other hand, the `refined` function is used to create a new branded type that has the same underlying type as the input,
but with a different name, and it also allows for validation of the input data.
The `refined` function takes a predicate that is used to validate the input data.
If the input data fails the validation, a `BrandErrors` is returned, which provides information about the specific validation failure.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [alias](#alias)
  - [Branded (type alias)](#branded-type-alias)
- [combining](#combining)
  - [all](#all)
- [constructors](#constructors)
  - [error](#error)
  - [errors](#errors)
  - [nominal](#nominal)
  - [refined](#refined)
- [models](#models)
  - [Brand (interface)](#brand-interface)
- [symbols](#symbols)
  - [BrandTypeId](#brandtypeid)
  - [BrandTypeId (type alias)](#brandtypeid-type-alias)
  - [RefinedConstructorsTypeId](#refinedconstructorstypeid)
  - [RefinedConstructorsTypeId (type alias)](#refinedconstructorstypeid-type-alias)
- [utils](#utils)
  - [Brand (namespace)](#brand-namespace)
    - [BrandErrors (interface)](#branderrors-interface)
    - [Constructor (interface)](#constructor-interface)
    - [RefinementError (interface)](#refinementerror-interface)
    - [Brands (type alias)](#brands-type-alias)
    - [EnsureCommonBase (type alias)](#ensurecommonbase-type-alias)
    - [FromConstructor (type alias)](#fromconstructor-type-alias)
    - [Unbranded (type alias)](#unbranded-type-alias)

---

# alias

## Branded (type alias)

**Signature**

```ts
export type Branded<A, K extends string | symbol> = A & Brand<K>
```

Added in v2.0.0

# combining

## all

Combines two or more brands together to form a single branded type.
This API is useful when you want to validate that the input data passes multiple brand validators.

**Signature**

```ts
export declare const all: <Brands extends readonly [Brand.Constructor<any>, ...Brand.Constructor<any>[]]>(
  ...brands: Brand.EnsureCommonBase<Brands>
) => Brand.Constructor<
  Types.UnionToIntersection<{ [B in keyof Brands]: Brand.FromConstructor<Brands[B]> }[number]> extends infer X extends
    Brand<any>
    ? X
    : Brand<any>
>
```

**Example**

```ts
import * as Brand from "effect/Brand"

type Int = number & Brand.Brand<"Int">
const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)
type Positive = number & Brand.Brand<"Positive">
const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

const PositiveInt = Brand.all(Int, Positive)

assert.strictEqual(PositiveInt(1), 1)
assert.throws(() => PositiveInt(1.1))
```

Added in v2.0.0

# constructors

## error

Returns a `BrandErrors` that contains a single `RefinementError`.

**Signature**

```ts
export declare const error: (message: string, meta?: unknown) => Brand.BrandErrors
```

Added in v2.0.0

## errors

Takes a variable number of `BrandErrors` and returns a single `BrandErrors` that contains all refinement errors.

**Signature**

```ts
export declare const errors: (...errors: Array<Brand.BrandErrors>) => Brand.BrandErrors
```

Added in v2.0.0

## nominal

This function returns a `Brand.Constructor` that **does not apply any runtime checks**, it just returns the provided value.
It can be used to create nominal types that allow distinguishing between two values of the same type but with different meanings.

If you also want to perform some validation, see {@link refined}.

**Signature**

```ts
export declare const nominal: <A extends Brand<any>>() => Brand.Constructor<A>
```

**Example**

```ts
import * as Brand from "effect/Brand"

type UserId = number & Brand.Brand<"UserId">

const UserId = Brand.nominal<UserId>()

assert.strictEqual(UserId(1), 1)
```

Added in v2.0.0

## refined

Returns a `Brand.Constructor` that can construct a branded type from an unbranded value using the provided `refinement`
predicate as validation of the input data.

If you don't want to perform any validation but only distinguish between two values of the same type but with different meanings,
see {@link nominal}.

**Signature**

```ts
export declare const refined: <A extends Brand<any>>(
  refinement: Predicate<Brand.Unbranded<A>>,
  onFailure: (a: Brand.Unbranded<A>) => Brand.BrandErrors
) => Brand.Constructor<A>
```

**Example**

```ts
import * as Brand from "effect/Brand"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

assert.strictEqual(Int(1), 1)
assert.throws(() => Int(1.1))
```

Added in v2.0.0

# models

## Brand (interface)

A generic interface that defines a branded type.

**Signature**

```ts
export interface Brand<in out K extends string | symbol> {
  readonly [BrandTypeId]: {
    readonly [k in K]: K
  }
}
```

Added in v2.0.0

# symbols

## BrandTypeId

**Signature**

```ts
export declare const BrandTypeId: typeof BrandTypeId
```

Added in v2.0.0

## BrandTypeId (type alias)

**Signature**

```ts
export type BrandTypeId = typeof BrandTypeId
```

Added in v2.0.0

## RefinedConstructorsTypeId

**Signature**

```ts
export declare const RefinedConstructorsTypeId: typeof RefinedConstructorsTypeId
```

Added in v2.0.0

## RefinedConstructorsTypeId (type alias)

**Signature**

```ts
export type RefinedConstructorsTypeId = typeof RefinedConstructorsTypeId
```

Added in v2.0.0

# utils

## Brand (namespace)

Added in v2.0.0

### BrandErrors (interface)

Represents a list of refinement errors.

**Signature**

```ts
export interface BrandErrors extends ReadonlyArray<RefinementError> {}
```

Added in v2.0.0

### Constructor (interface)

**Signature**

```ts
export interface Constructor<in out A extends Brand<any>> {
  readonly [RefinedConstructorsTypeId]: RefinedConstructorsTypeId
  /**
   * Constructs a branded type from a value of type `A`, throwing an error if
   * the provided `A` is not valid.
   */
  (args: Brand.Unbranded<A>): A
  /**
   * Constructs a branded type from a value of type `A`, returning `Some<A>`
   * if the provided `A` is valid, `None` otherwise.
   */
  option: (args: Brand.Unbranded<A>) => Option.Option<A>
  /**
   * Constructs a branded type from a value of type `A`, returning `Right<A>`
   * if the provided `A` is valid, `Left<BrandError>` otherwise.
   */
  either: (args: Brand.Unbranded<A>) => Either<Brand.BrandErrors, A>
  /**
   * Attempts to refine the provided value of type `A`, returning `true` if
   * the provided `A` is valid, `false` otherwise.
   */
  is: Refinement<Brand.Unbranded<A>, Brand.Unbranded<A> & A>
}
```

Added in v2.0.0

### RefinementError (interface)

Represents an error that occurs when the provided value of the branded type does not pass the refinement predicate.

**Signature**

```ts
export interface RefinementError {
  readonly meta: unknown
  readonly message: string
}
```

Added in v2.0.0

### Brands (type alias)

A utility type to extract the brands from a branded type.

**Signature**

```ts
export type Brands<P> = P extends Brand<any>
  ? Types.UnionToIntersection<
      {
        [k in keyof P[BrandTypeId]]: k extends string | symbol ? Brand<k> : never
      }[keyof P[BrandTypeId]]
    >
  : never
```

Added in v2.0.0

### EnsureCommonBase (type alias)

A utility type that checks that all brands have the same base type.

**Signature**

```ts
export type EnsureCommonBase<Brands extends readonly [Brand.Constructor<any>, ...Array<Brand.Constructor<any>>]> = {
  [B in keyof Brands]: Brand.Unbranded<Brand.FromConstructor<Brands[0]>> extends Brand.Unbranded<
    Brand.FromConstructor<Brands[B]>
  >
    ? Brand.Unbranded<Brand.FromConstructor<Brands[B]>> extends Brand.Unbranded<Brand.FromConstructor<Brands[0]>>
      ? Brands[B]
      : Brands[B]
    : "ERROR: All brands should have the same base type"
}
```

Added in v2.0.0

### FromConstructor (type alias)

A utility type to extract a branded type from a `Brand.Constructor`.

**Signature**

```ts
export type FromConstructor<A> = A extends Brand.Constructor<infer B> ? B : never
```

Added in v2.0.0

### Unbranded (type alias)

A utility type to extract the value type from a brand.

**Signature**

```ts
export type Unbranded<P> = P extends infer Q & Brands<P> ? Q : P
```

Added in v2.0.0
