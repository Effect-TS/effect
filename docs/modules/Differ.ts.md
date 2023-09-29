---
title: Differ.ts
nav_order: 26
parent: Modules
---

## Differ overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [chunk](#chunk)
  - [environment](#environment)
  - [hashMap](#hashmap)
  - [hashSet](#hashset)
  - [make](#make)
- [models](#models)
  - [Differ (interface)](#differ-interface)
- [patch](#patch)
  - [combine](#combine)
  - [diff](#diff)
  - [empty](#empty)
  - [patch](#patch-1)
- [symbol](#symbol)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [utils](#utils)
  - [Differ (namespace)](#differ-namespace)
    - [Chunk (namespace)](#chunk-namespace)
      - [Patch (interface)](#patch-interface)
      - [TypeId (type alias)](#typeid-type-alias-1)
    - [Context (namespace)](#context-namespace)
      - [Patch (interface)](#patch-interface-1)
      - [TypeId (type alias)](#typeid-type-alias-2)
    - [HashMap (namespace)](#hashmap-namespace)
      - [Patch (interface)](#patch-interface-2)
      - [TypeId (type alias)](#typeid-type-alias-3)
    - [HashSet (namespace)](#hashset-namespace)
      - [Patch (interface)](#patch-interface-3)
      - [TypeId (type alias)](#typeid-type-alias-4)
    - [Or (namespace)](#or-namespace)
      - [Patch (interface)](#patch-interface-4)
      - [TypeId (type alias)](#typeid-type-alias-5)
  - [orElseEither](#orelseeither)
  - [transform](#transform)
  - [update](#update)
  - [updateWith](#updatewith)
  - [zip](#zip)

---

# constructors

## chunk

Constructs a differ that knows how to diff a `Chunk` of values given a
differ that knows how to diff the values.

**Signature**

```ts
export declare const chunk: <Value, Patch>(
  differ: Differ<Value, Patch>
) => Differ<Chunk<Value>, Differ.Chunk.Patch<Value, Patch>>
```

Added in v2.0.0

## environment

Constructs a differ that knows how to diff `Env` values.

**Signature**

```ts
export declare const environment: <A>() => Differ<Context<A>, Differ.Context.Patch<A, A>>
```

Added in v2.0.0

## hashMap

Constructs a differ that knows how to diff a `HashMap` of keys and values given
a differ that knows how to diff the values.

**Signature**

```ts
export declare const hashMap: <Key, Value, Patch>(
  differ: Differ<Value, Patch>
) => Differ<HashMap<Key, Value>, Differ.HashMap.Patch<Key, Value, Patch>>
```

Added in v2.0.0

## hashSet

Constructs a differ that knows how to diff a `HashSet` of values.

**Signature**

```ts
export declare const hashSet: <Value>() => Differ<HashSet<Value>, Differ.HashSet.Patch<Value>>
```

Added in v2.0.0

## make

Constructs a new `Differ`.

**Signature**

```ts
export declare const make: <Value, Patch>(params: {
  readonly empty: Patch
  readonly diff: (oldValue: Value, newValue: Value) => Patch
  readonly combine: (first: Patch, second: Patch) => Patch
  readonly patch: (patch: Patch, oldValue: Value) => Value
}) => Differ<Value, Patch>
```

Added in v2.0.0

# models

## Differ (interface)

A `Differ<Value, Patch>` knows how to compare an old value and new value of
type `Value` to produce a patch of type `Patch` that describes the
differences between those values. A `Differ` also knows how to apply a patch
to an old value to produce a new value that represents the old value updated
with the changes described by the patch.

A `Differ` can be used to construct a `FiberRef` supporting compositional
updates using the `FiberRef.makePatch` constructor.

The `Differ` companion object contains constructors for `Differ` values for
common data types such as `Chunk`, `HashMap`, and ` HashSet``. In addition,
 `Differ`values can be transformed using the `transform`operator and combined
using the`orElseEither`and`zip`operators. This allows creating`Differ`
values for arbitrarily complex data types compositionally.

**Signature**

```ts
export interface Differ<Value, Patch> {
  readonly [TypeId]: {
    readonly _V: (_: Value) => Value
    readonly _P: (_: Patch) => Patch
  }
  readonly empty: Patch
  readonly diff: (oldValue: Value, newValue: Value) => Patch
  readonly combine: (first: Patch, second: Patch) => Patch
  readonly patch: (patch: Patch, oldValue: Value) => Value
}
```

Added in v2.0.0

# patch

## combine

Combines two patches to produce a new patch that describes the updates of
the first patch and then the updates of the second patch. The combine
operation should be associative. In addition, if the combine operation is
commutative then joining multiple fibers concurrently will result in
deterministic `FiberRef` values.

**Signature**

```ts
export declare const combine: {
  <Patch>(first: Patch, second: Patch): <Value>(self: Differ<Value, Patch>) => Patch
  <Value, Patch>(self: Differ<Value, Patch>, first: Patch, second: Patch): Patch
}
```

Added in v2.0.0

## diff

**Signature**

```ts
export declare const diff: {
  <Value>(oldValue: Value, newValue: Value): <Patch>(self: Differ<Value, Patch>) => Patch
  <Value, Patch>(self: Differ<Value, Patch>, oldValue: Value, newValue: Value): Patch
}
```

Added in v2.0.0

## empty

An empty patch that describes no changes.

**Signature**

```ts
export declare const empty: <Value, Patch>(self: Differ<Value, Patch>) => Patch
```

Added in v2.0.0

## patch

Applies a patch to an old value to produce a new value that is equal to the
old value with the updates described by the patch.

**Signature**

```ts
export declare const patch: {
  <Patch, Value>(patch: Patch, oldValue: Value): (self: Differ<Value, Patch>) => Value
  <Patch, Value>(self: Differ<Value, Patch>, patch: Patch, oldValue: Value): Value
}
```

Added in v2.0.0

# symbol

## TypeId

**Signature**

```ts
export declare const TypeId: typeof TypeId
```

Added in v2.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# utils

## Differ (namespace)

Added in v2.0.0

### Chunk (namespace)

Added in v2.0.0

#### Patch (interface)

A patch which describes updates to a chunk of values.

**Signature**

```ts
export interface Patch<Value, Patch> extends Equal {
  readonly [ChunkPatchTypeId]: {
    readonly _Value: (_: Value) => Value
    readonly _Patch: (_: Patch) => Patch
  }
}
```

Added in v2.0.0

#### TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof ChunkPatchTypeId
```

Added in v2.0.0

### Context (namespace)

Added in v2.0.0

#### Patch (interface)

A `Patch<Input, Output>` describes an update that transforms a `Env<Input>`
to a `Env<Output>` as a data structure. This allows combining updates to
different services in the environment in a compositional way.

**Signature**

```ts
export interface Patch<Input, Output> extends Equal {
  readonly [ContextPatchTypeId]: {
    readonly _Input: (_: Input) => void
    readonly _Output: (_: never) => Output
  }
}
```

Added in v2.0.0

#### TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof ContextPatchTypeId
```

Added in v2.0.0

### HashMap (namespace)

Added in v2.0.0

#### Patch (interface)

A patch which describes updates to a map of keys and values.

**Signature**

```ts
export interface Patch<Key, Value, Patch> extends Equal {
  readonly [HashMapPatchTypeId]: {
    readonly _Key: (_: Key) => Key
    readonly _Value: (_: Value) => Value
    readonly _Patch: (_: Patch) => Patch
  }
}
```

Added in v2.0.0

#### TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof HashMapPatchTypeId
```

Added in v2.0.0

### HashSet (namespace)

Added in v2.0.0

#### Patch (interface)

A patch which describes updates to a set of values.

**Signature**

```ts
export interface Patch<Value> extends Equal {
  readonly [HashSetPatchTypeId]: {
    readonly _Value: (_: Value) => Value
  }
}
```

Added in v2.0.0

#### TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof HashSetPatchTypeId
```

Added in v2.0.0

### Or (namespace)

Added in v2.0.0

#### Patch (interface)

A patch which describes updates to either one value or another.

**Signature**

```ts
export interface Patch<Value, Value2, Patch, Patch2> extends Equal {
  readonly [OrPatchTypeId]: {
    readonly _Value: (_: Value) => Value
    readonly _Value2: (_: Value2) => Value2
    readonly _Patch: (_: Patch) => Patch
    readonly _Patch2: (_: Patch2) => Patch2
  }
}
```

Added in v2.0.0

#### TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof OrPatchTypeId
```

Added in v2.0.0

## orElseEither

Combines this differ and the specified differ to produce a differ that
knows how to diff the sum of their values.

**Signature**

```ts
export declare const orElseEither: {
  <Value2, Patch2>(that: Differ<Value2, Patch2>): <Value, Patch>(
    self: Differ<Value, Patch>
  ) => Differ<Either<Value, Value2>, Differ.Or.Patch<Value, Value2, Patch, Patch2>>
  <Value, Patch, Value2, Patch2>(self: Differ<Value, Patch>, that: Differ<Value2, Patch2>): Differ<
    Either<Value, Value2>,
    Differ.Or.Patch<Value, Value2, Patch, Patch2>
  >
}
```

Added in v2.0.0

## transform

Transforms the type of values that this differ knows how to differ using
the specified functions that map the new and old value types to each other.

**Signature**

```ts
export declare const transform: {
  <Value, Value2>(options: { readonly toNew: (value: Value) => Value2; readonly toOld: (value: Value2) => Value }): <
    Patch
  >(
    self: Differ<Value, Patch>
  ) => Differ<Value2, Patch>
  <Value, Patch, Value2>(
    self: Differ<Value, Patch>,
    options: { readonly toNew: (value: Value) => Value2; readonly toOld: (value: Value2) => Value }
  ): Differ<Value2, Patch>
}
```

Added in v2.0.0

## update

Constructs a differ that just diffs two values by returning a function that
sets the value to the new value. This differ does not support combining
multiple updates to the value compositionally and should only be used when
there is no compositional way to update them.

**Signature**

```ts
export declare const update: <A>() => Differ<A, (a: A) => A>
```

Added in v2.0.0

## updateWith

A variant of `update` that allows specifying the function that will be used
to combine old values with new values.

**Signature**

```ts
export declare const updateWith: <A>(f: (x: A, y: A) => A) => Differ<A, (a: A) => A>
```

Added in v2.0.0

## zip

Combines this differ and the specified differ to produce a new differ that
knows how to diff the product of their values.

**Signature**

```ts
export declare const zip: {
  <Value2, Patch2>(that: Differ<Value2, Patch2>): <Value, Patch>(
    self: Differ<Value, Patch>
  ) => Differ<readonly [Value, Value2], readonly [Patch, Patch2]>
  <Value, Patch, Value2, Patch2>(self: Differ<Value, Patch>, that: Differ<Value2, Patch2>): Differ<
    readonly [Value, Value2],
    readonly [Patch, Patch2]
  >
}
```

Added in v2.0.0
