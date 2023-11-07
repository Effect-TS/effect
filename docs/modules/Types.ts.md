---
title: Types.ts
nav_order: 140
parent: Modules
---

## Types overview

A collection of types that are commonly used types.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [Concurrency (type alias)](#concurrency-type-alias)
  - [Equals (type alias)](#equals-type-alias)
  - [MergeLeft (type alias)](#mergeleft-type-alias)
  - [MergeRight (type alias)](#mergeright-type-alias)
  - [NoInfer (type alias)](#noinfer-type-alias)
- [types](#types)
  - [ExcludeTag (type alias)](#excludetag-type-alias)
  - [ExtractTag (type alias)](#extracttag-type-alias)
  - [Mutable (type alias)](#mutable-type-alias)
  - [Simplify (type alias)](#simplify-type-alias)
  - [Tags (type alias)](#tags-type-alias)
  - [UnionToIntersection (type alias)](#uniontointersection-type-alias)

---

# models

## Concurrency (type alias)

Describes the concurrency to use when executing multiple Effect's.

**Signature**

```ts
export type Concurrency = number | "unbounded" | "inherit"
```

Added in v2.0.0

## Equals (type alias)

Determines if two types are equal.

**Signature**

```ts
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
```

**Example**

```ts
import * as Types from "effect/Types"

type Res1 = Types.Equals<{ a: number }, { a: number }> // true
type Res2 = Types.Equals<{ a: number }, { b: number }> // false
```

Added in v2.0.0

## MergeLeft (type alias)

Merges two object where the keys of the left object take precedence in the case of a conflict.

**Signature**

```ts
export type MergeLeft<K, H> = Simplify<{
  [k in keyof K | keyof H]: k extends keyof K ? K[k] : k extends keyof H ? H[k] : never
}>
```

**Example**

```ts
import * as Types from "effect/Types"
type MergeLeft = Types.MergeLeft<{ a: number; b: number }, { a: string }> // { a: number; b: number; }
```

Added in v2.0.0

## MergeRight (type alias)

Merges two object where the keys of the right object take precedence in the case of a conflict.

**Signature**

```ts
export type MergeRight<K, H> = Simplify<{
  [k in keyof K | keyof H]: k extends keyof H ? H[k] : k extends keyof K ? K[k] : never
}>
```

**Example**

```ts
import * as Types from "effect/Types"
type MergeRight = Types.MergeRight<{ a: number; b: number }, { a: string }> // { a: string; b: number; }
```

Added in v2.0.0

## NoInfer (type alias)

Avoid inference on a specific parameter

**Signature**

```ts
export type NoInfer<A> = [A][A extends any ? 0 : never]
```

Added in v2.0.0

# types

## ExcludeTag (type alias)

Excludes the tagged object from the type.

**Signature**

```ts
export type ExcludeTag<E, K extends Tags<E>> = Exclude<E, { _tag: K }>
```

**Example**

```ts
import * as Types from "effect/Types"

type Res = Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> // string | { _tag: "b" }
```

Added in v2.0.0

## ExtractTag (type alias)

Extracts the type of the given tag.

**Signature**

```ts
export type ExtractTag<E, K extends Tags<E>> = Extract<E, { _tag: K }>
```

**Example**

```ts
import * as Types from "effect/Types"

type Res = Types.ExtractTag<{ _tag: "a"; a: number } | { _tag: "b"; b: number }, "b"> // { _tag: "b", b: number }
```

Added in v2.0.0

## Mutable (type alias)

Make all properties in `T` mutable. Supports arrays, tuples, and records as well.

**Signature**

```ts
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
```

**Example**

```ts
import type * as Types from "effect/Types"

type MutableStruct = Types.Mutable<{ readonly a: string; readonly b: number }> // { a: string; b: number; }

type MutableArray = Types.Mutable<ReadonlyArray<string>> // string[]

type MutableTuple = Types.Mutable<readonly [string, number]> // [string, number]

type MutableRecord = Types.Mutable<{ readonly [_: string]: number }> // { [x: string]: number; }
```

Added in v2.0.0

## Simplify (type alias)

Simplifies the type signature of a type.

**Signature**

```ts
export type Simplify<A> = {
  [K in keyof A]: A[K]
} extends infer B
  ? B
  : never
```

**Example**

```ts
import * as Types from "effect/Types"

type Res = Types.Simplify<{ a: number } & { b: number }> // { a: number; b: number; }
```

Added in v2.0.0

## Tags (type alias)

Returns the tags in a type.

**Signature**

```ts
export type Tags<E> = E extends { _tag: string } ? E["_tag"] : never
```

**Example**

```ts
import * as Types from "effect/Types"

type Res = Types.Tags<string | { _tag: "a" } | { _tag: "b" }> // "a" | "b"
```

Added in v2.0.0

## UnionToIntersection (type alias)

A utility type that transforms a union type `T` into an intersection type.

**Signature**

```ts
export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never
```

Added in v2.0.0
