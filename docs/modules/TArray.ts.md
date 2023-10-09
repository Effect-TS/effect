---
title: TArray.ts
nav_order: 119
parent: Modules
---

## TArray overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [destructors](#destructors)
  - [toArray](#toarray)
- [elements](#elements)
  - [collectFirst](#collectfirst)
  - [collectFirstSTM](#collectfirststm)
  - [contains](#contains)
  - [every](#every)
  - [everySTM](#everystm)
  - [findFirst](#findfirst)
  - [findFirstIndex](#findfirstindex)
  - [findFirstIndexFrom](#findfirstindexfrom)
  - [findFirstIndexWhere](#findfirstindexwhere)
  - [findFirstIndexWhereFrom](#findfirstindexwherefrom)
  - [findFirstIndexWhereFromSTM](#findfirstindexwherefromstm)
  - [findFirstIndexWhereSTM](#findfirstindexwherestm)
  - [findFirstSTM](#findfirststm)
  - [findLast](#findlast)
  - [findLastIndex](#findlastindex)
  - [findLastIndexFrom](#findlastindexfrom)
  - [findLastSTM](#findlaststm)
  - [forEach](#foreach)
  - [get](#get)
  - [headOption](#headoption)
  - [lastOption](#lastoption)
  - [maxOption](#maxoption)
  - [minOption](#minoption)
  - [reduceOption](#reduceoption)
  - [reduceOptionSTM](#reduceoptionstm)
  - [some](#some)
  - [someSTM](#somestm)
  - [transform](#transform)
  - [transformSTM](#transformstm)
  - [update](#update)
  - [updateSTM](#updatestm)
- [folding](#folding)
  - [count](#count)
  - [countSTM](#countstm)
  - [reduce](#reduce)
  - [reduceSTM](#reducestm)
- [getters](#getters)
  - [size](#size)
- [models](#models)
  - [TArray (interface)](#tarray-interface)
- [symbols](#symbols)
  - [TArrayTypeId](#tarraytypeid)
  - [TArrayTypeId (type alias)](#tarraytypeid-type-alias)
- [utils](#utils)
  - [TArray (namespace)](#tarray-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## empty

Makes an empty `TArray`.

**Signature**

```ts
export declare const empty: <A>() => STM.STM<never, never, TArray<A>>
```

Added in v2.0.0

## fromIterable

Makes a new `TArray` initialized with provided iterable.

**Signature**

```ts
export declare const fromIterable: <A>(iterable: Iterable<A>) => STM.STM<never, never, TArray<A>>
```

Added in v2.0.0

## make

Makes a new `TArray` that is initialized with specified values.

**Signature**

```ts
export declare const make: <Elements extends [any, ...any[]]>(
  ...elements: Elements
) => STM.STM<never, never, TArray<Elements[number]>>
```

Added in v2.0.0

# destructors

## toArray

Collects all elements into a chunk.

**Signature**

```ts
export declare const toArray: <A>(self: TArray<A>) => STM.STM<never, never, A[]>
```

Added in v2.0.0

# elements

## collectFirst

Finds the result of applying a partial function to the first value in its
domain.

**Signature**

```ts
export declare const collectFirst: {
  <A, B>(pf: (a: A) => Option.Option<B>): (self: TArray<A>) => STM.STM<never, never, Option.Option<B>>
  <A, B>(self: TArray<A>, pf: (a: A) => Option.Option<B>): STM.STM<never, never, Option.Option<B>>
}
```

Added in v2.0.0

## collectFirstSTM

Finds the result of applying an transactional partial function to the first
value in its domain.

**Signature**

```ts
export declare const collectFirstSTM: {
  <A, R, E, B>(pf: (a: A) => Option.Option<STM.STM<R, E, B>>): (self: TArray<A>) => STM.STM<R, E, Option.Option<B>>
  <A, R, E, B>(self: TArray<A>, pf: (a: A) => Option.Option<STM.STM<R, E, B>>): STM.STM<R, E, Option.Option<B>>
}
```

Added in v2.0.0

## contains

Determine if the array contains a specified value.

**Signature**

```ts
export declare const contains: {
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, boolean>
  <A>(self: TArray<A>, value: A): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## every

Atomically evaluate the conjunction of a predicate across the members of
the array.

**Signature**

```ts
export declare const every: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, boolean>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## everySTM

Atomically evaluate the conjunction of a transactional predicate across the
members of the array.

**Signature**

```ts
export declare const everySTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, boolean>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean>
}
```

Added in v2.0.0

## findFirst

Find the first element in the array matching the specified predicate.

**Signature**

```ts
export declare const findFirst: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<A>>
}
```

Added in v2.0.0

## findFirstIndex

Get the first index of a specific value in the array.

**Signature**

```ts
export declare const findFirstIndex: {
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, value: A): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findFirstIndexFrom

Get the first index of a specific value in the array starting from the
specified index.

**Signature**

```ts
export declare const findFirstIndexFrom: {
  <A>(value: A, from: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, value: A, from: number): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findFirstIndexWhere

Get the index of the first entry in the array matching a predicate.

**Signature**

```ts
export declare const findFirstIndexWhere: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findFirstIndexWhereFrom

Get the index of the first entry in the array starting from the specified
index, matching a predicate.

**Signature**

```ts
export declare const findFirstIndexWhereFrom: {
  <A>(predicate: Predicate<A>, from: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, predicate: Predicate<A>, from: number): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findFirstIndexWhereFromSTM

Starting at specified index, get the index of the next entry that matches a
transactional predicate.

**Signature**

```ts
export declare const findFirstIndexWhereFromSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>, from: number): (
    self: TArray<A>
  ) => STM.STM<R, E, Option.Option<number>>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>, from: number): STM.STM<
    R,
    E,
    Option.Option<number>
  >
}
```

Added in v2.0.0

## findFirstIndexWhereSTM

Get the index of the next entry that matches a transactional predicate.

**Signature**

```ts
export declare const findFirstIndexWhereSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<number>>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<number>>
}
```

Added in v2.0.0

## findFirstSTM

Find the first element in the array matching a transactional predicate.

**Signature**

```ts
export declare const findFirstSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## findLast

Find the last element in the array matching a predicate.

**Signature**

```ts
export declare const findLast: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<A>>
}
```

Added in v2.0.0

## findLastIndex

Get the last index of a specific value in the array bounded above by a
specific index.

**Signature**

```ts
export declare const findLastIndex: {
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, value: A): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findLastIndexFrom

Get the last index of a specific value in the array bounded above by a
specific index.

**Signature**

```ts
export declare const findLastIndexFrom: {
  <A>(value: A, end: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
  <A>(self: TArray<A>, value: A, end: number): STM.STM<never, never, Option.Option<number>>
}
```

Added in v2.0.0

## findLastSTM

Find the last element in the array matching a transactional predicate.

**Signature**

```ts
export declare const findLastSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## forEach

Atomically performs transactional effect for each item in array.

**Signature**

```ts
export declare const forEach: {
  <A, R, E>(f: (value: A) => STM.STM<R, E, void>): (self: TArray<A>) => STM.STM<R, E, void>
  <A, R, E>(self: TArray<A>, f: (value: A) => STM.STM<R, E, void>): STM.STM<R, E, void>
}
```

Added in v2.0.0

## get

Extracts value from ref in array.

**Signature**

```ts
export declare const get: {
  (index: number): <A>(self: TArray<A>) => STM.STM<never, never, A>
  <A>(self: TArray<A>, index: number): STM.STM<never, never, A>
}
```

Added in v2.0.0

## headOption

The first entry of the array, if it exists.

**Signature**

```ts
export declare const headOption: <A>(self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v2.0.0

## lastOption

The last entry in the array, if it exists.

**Signature**

```ts
export declare const lastOption: <A>(self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v2.0.0

## maxOption

Atomically compute the greatest element in the array, if it exists.

**Signature**

```ts
export declare const maxOption: {
  <A>(order: Order.Order<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
  <A>(self: TArray<A>, order: Order.Order<A>): STM.STM<never, never, Option.Option<A>>
}
```

Added in v2.0.0

## minOption

Atomically compute the least element in the array, if it exists.

**Signature**

```ts
export declare const minOption: {
  <A>(order: Order.Order<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
  <A>(self: TArray<A>, order: Order.Order<A>): STM.STM<never, never, Option.Option<A>>
}
```

Added in v2.0.0

## reduceOption

Atomically reduce the array, if non-empty, by a binary operator.

**Signature**

```ts
export declare const reduceOption: {
  <A>(f: (x: A, y: A) => A): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
  <A>(self: TArray<A>, f: (x: A, y: A) => A): STM.STM<never, never, Option.Option<A>>
}
```

Added in v2.0.0

## reduceOptionSTM

Atomically reduce the non-empty array using a transactional binary
operator.

**Signature**

```ts
export declare const reduceOptionSTM: {
  <A, R, E>(f: (x: A, y: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
  <A, R, E>(self: TArray<A>, f: (x: A, y: A) => STM.STM<R, E, A>): STM.STM<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## some

Determine if the array contains a value satisfying a predicate.

**Signature**

```ts
export declare const some: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, boolean>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## someSTM

Determine if the array contains a value satisfying a transactional
predicate.

**Signature**

```ts
export declare const someSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, boolean>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean>
}
```

Added in v2.0.0

## transform

Atomically updates all elements using a pure function.

**Signature**

```ts
export declare const transform: {
  <A>(f: (value: A) => A): (self: TArray<A>) => STM.STM<never, never, void>
  <A>(self: TArray<A>, f: (value: A) => A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## transformSTM

Atomically updates all elements using a transactional effect.

**Signature**

```ts
export declare const transformSTM: {
  <A, R, E>(f: (value: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, void>
  <A, R, E>(self: TArray<A>, f: (value: A) => STM.STM<R, E, A>): STM.STM<R, E, void>
}
```

Added in v2.0.0

## update

Updates element in the array with given function.

**Signature**

```ts
export declare const update: {
  <A>(index: number, f: (value: A) => A): (self: TArray<A>) => STM.STM<never, never, void>
  <A>(self: TArray<A>, index: number, f: (value: A) => A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## updateSTM

Atomically updates element in the array with given transactional effect.

**Signature**

```ts
export declare const updateSTM: {
  <A, R, E>(index: number, f: (value: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, void>
  <A, R, E>(self: TArray<A>, index: number, f: (value: A) => STM.STM<R, E, A>): STM.STM<R, E, void>
}
```

Added in v2.0.0

# folding

## count

Count the values in the array matching a predicate.

**Signature**

```ts
export declare const count: {
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, number>
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, number>
}
```

Added in v2.0.0

## countSTM

Count the values in the array matching a transactional predicate.

**Signature**

```ts
export declare const countSTM: {
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, number>
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, number>
}
```

Added in v2.0.0

## reduce

Atomically folds using a pure function.

**Signature**

```ts
export declare const reduce: {
  <Z, A>(zero: Z, f: (accumulator: Z, current: A) => Z): (self: TArray<A>) => STM.STM<never, never, Z>
  <Z, A>(self: TArray<A>, zero: Z, f: (accumulator: Z, current: A) => Z): STM.STM<never, never, Z>
}
```

Added in v2.0.0

## reduceSTM

Atomically folds using a transactional function.

**Signature**

```ts
export declare const reduceSTM: {
  <Z, A, R, E>(zero: Z, f: (accumulator: Z, current: A) => STM.STM<R, E, Z>): (self: TArray<A>) => STM.STM<R, E, Z>
  <Z, A, R, E>(self: TArray<A>, zero: Z, f: (accumulator: Z, current: A) => STM.STM<R, E, Z>): STM.STM<R, E, Z>
}
```

Added in v2.0.0

# getters

## size

Returns the size of the `TArray`.

**Signature**

```ts
export declare const size: <A>(self: TArray<A>) => number
```

Added in v2.0.0

# models

## TArray (interface)

**Signature**

```ts
export interface TArray<A> extends TArray.Variance<A> {}
```

Added in v2.0.0

# symbols

## TArrayTypeId

**Signature**

```ts
export declare const TArrayTypeId: typeof TArrayTypeId
```

Added in v2.0.0

## TArrayTypeId (type alias)

**Signature**

```ts
export type TArrayTypeId = typeof TArrayTypeId
```

Added in v2.0.0

# utils

## TArray (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [TArrayTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
