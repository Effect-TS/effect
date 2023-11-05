---
title: TMap.ts
nav_order: 129
parent: Modules
---

## TMap overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [destructors](#destructors)
  - [toChunk](#tochunk)
  - [toHashMap](#tohashmap)
  - [toReadonlyArray](#toreadonlyarray)
  - [toReadonlyMap](#toreadonlymap)
- [elements](#elements)
  - [find](#find)
  - [findAll](#findall)
  - [findAllSTM](#findallstm)
  - [findSTM](#findstm)
  - [forEach](#foreach)
  - [get](#get)
  - [getOrElse](#getorelse)
  - [has](#has)
  - [keys](#keys)
  - [values](#values)
- [folding](#folding)
  - [reduce](#reduce)
  - [reduceSTM](#reducestm)
  - [reduceWithIndex](#reducewithindex)
  - [reduceWithIndexSTM](#reducewithindexstm)
- [getters](#getters)
  - [isEmpty](#isempty)
  - [size](#size)
- [models](#models)
  - [TMap (interface)](#tmap-interface)
- [mutations](#mutations)
  - [merge](#merge)
  - [remove](#remove)
  - [removeAll](#removeall)
  - [removeIf](#removeif)
  - [removeIfDiscard](#removeifdiscard)
  - [retainIf](#retainif)
  - [retainIfDiscard](#retainifdiscard)
  - [set](#set)
  - [setIfAbsent](#setifabsent)
  - [takeFirst](#takefirst)
  - [takeFirstSTM](#takefirststm)
  - [takeSome](#takesome)
  - [takeSomeSTM](#takesomestm)
  - [transform](#transform)
  - [transformSTM](#transformstm)
  - [transformValues](#transformvalues)
  - [transformValuesSTM](#transformvaluesstm)
  - [updateWith](#updatewith)
- [symbols](#symbols)
  - [TMapTypeId](#tmaptypeid)
  - [TMapTypeId (type alias)](#tmaptypeid-type-alias)
- [utils](#utils)
  - [TMap (namespace)](#tmap-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## empty

Makes an empty `TMap`.

**Signature**

```ts
export declare const empty: <K, V>() => STM<never, never, TMap<K, V>>
```

Added in v2.0.0

## fromIterable

Makes a new `TMap` initialized with provided iterable.

**Signature**

```ts
export declare const fromIterable: <K, V>(iterable: Iterable<readonly [K, V]>) => STM<never, never, TMap<K, V>>
```

Added in v2.0.0

## make

Makes a new `TMap` that is initialized with specified values.

**Signature**

```ts
export declare const make: <K, V>(...entries: (readonly [K, V])[]) => STM<never, never, TMap<K, V>>
```

Added in v2.0.0

# destructors

## toChunk

Collects all bindings into a `Chunk`.

**Signature**

```ts
export declare const toChunk: <K, V>(self: TMap<K, V>) => STM<never, never, (readonly [K, V])[]>
```

Added in v2.0.0

## toHashMap

Collects all bindings into a `HashMap`.

**Signature**

```ts
export declare const toHashMap: <K, V>(self: TMap<K, V>) => STM<never, never, HashMap<K, V>>
```

Added in v2.0.0

## toReadonlyArray

Collects all bindings into a `ReadonlyArray`.

**Signature**

```ts
export declare const toReadonlyArray: <K, V>(self: TMap<K, V>) => STM<never, never, readonly (readonly [K, V])[]>
```

Added in v2.0.0

## toReadonlyMap

Collects all bindings into a `ReadonlyMap`.

**Signature**

```ts
export declare const toReadonlyMap: <K, V>(self: TMap<K, V>) => STM<never, never, ReadonlyMap<K, V>>
```

Added in v2.0.0

# elements

## find

Finds the key/value pair matching the specified predicate, and uses the
provided function to extract a value out of it.

**Signature**

```ts
export declare const find: {
  <K, V, A>(pf: (key: K, value: V) => Option<A>): (self: TMap<K, V>) => STM<never, never, Option<A>>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option<A>): STM<never, never, Option<A>>
}
```

Added in v2.0.0

## findAll

Finds all the key/value pairs matching the specified predicate, and uses
the provided function to extract values out them.

**Signature**

```ts
export declare const findAll: {
  <K, V, A>(pf: (key: K, value: V) => Option<A>): (self: TMap<K, V>) => STM<never, never, A[]>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option<A>): STM<never, never, A[]>
}
```

Added in v2.0.0

## findAllSTM

Finds all the key/value pairs matching the specified predicate, and uses
the provided effectful function to extract values out of them..

**Signature**

```ts
export declare const findAllSTM: {
  <K, V, R, E, A>(pf: (key: K, value: V) => STM<R, Option<E>, A>): (self: TMap<K, V>) => STM<R, E, A[]>
  <K, V, R, E, A>(self: TMap<K, V>, pf: (key: K, value: V) => STM<R, Option<E>, A>): STM<R, E, A[]>
}
```

Added in v2.0.0

## findSTM

Finds the key/value pair matching the specified predicate, and uses the
provided effectful function to extract a value out of it.

**Signature**

```ts
export declare const findSTM: {
  <K, V, R, E, A>(
    f: (key: K, value: V) => STM<R, Option<E>, A>
  ): (self: TMap<K, V>) => STM<R, E, Option<A>>
  <K, V, R, E, A>(
    self: TMap<K, V>,
    f: (key: K, value: V) => STM<R, Option<E>, A>
  ): STM<R, E, Option<A>>
}
```

Added in v2.0.0

## forEach

Atomically performs transactional-effect for each binding present in map.

**Signature**

```ts
export declare const forEach: {
  <K, V, R, E, _>(f: (key: K, value: V) => STM<R, E, _>): (self: TMap<K, V>) => STM<R, E, void>
  <K, V, R, E, _>(self: TMap<K, V>, f: (key: K, value: V) => STM<R, E, _>): STM<R, E, void>
}
```

Added in v2.0.0

## get

Retrieves value associated with given key.

**Signature**

```ts
export declare const get: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM<never, never, Option<V>>
  <K, V>(self: TMap<K, V>, key: K): STM<never, never, Option<V>>
}
```

Added in v2.0.0

## getOrElse

Retrieves value associated with given key or default value, in case the key
isn't present.

**Signature**

```ts
export declare const getOrElse: {
  <K, V>(key: K, fallback: LazyArg<V>): (self: TMap<K, V>) => STM<never, never, V>
  <K, V>(self: TMap<K, V>, key: K, fallback: LazyArg<V>): STM<never, never, V>
}
```

Added in v2.0.0

## has

Tests whether or not map contains a key.

**Signature**

```ts
export declare const has: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM<never, never, boolean>
  <K, V>(self: TMap<K, V>, key: K): STM<never, never, boolean>
}
```

Added in v2.0.0

## keys

Collects all keys stored in map.

**Signature**

```ts
export declare const keys: <K, V>(self: TMap<K, V>) => STM<never, never, K[]>
```

Added in v2.0.0

## values

Collects all values stored in map.

**Signature**

```ts
export declare const values: <K, V>(self: TMap<K, V>) => STM<never, never, V[]>
```

Added in v2.0.0

# folding

## reduce

Atomically folds using a pure function.

**Signature**

```ts
export declare const reduce: {
  <Z, V>(zero: Z, f: (acc: Z, value: V) => Z): <K>(self: TMap<K, V>) => STM<never, never, Z>
  <K, V, Z>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V) => Z): STM<never, never, Z>
}
```

Added in v2.0.0

## reduceSTM

Atomically folds using a transactional function.

**Signature**

```ts
export declare const reduceSTM: {
  <Z, V, R, E>(zero: Z, f: (acc: Z, value: V) => STM<R, E, Z>): <K>(self: TMap<K, V>) => STM<R, E, Z>
  <K, V, Z, R, E>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V) => STM<R, E, Z>): STM<R, E, Z>
}
```

Added in v2.0.0

## reduceWithIndex

Atomically folds using a pure function.

**Signature**

```ts
export declare const reduceWithIndex: {
  <Z, K, V>(zero: Z, f: (acc: Z, value: V, key: K) => Z): (self: TMap<K, V>) => STM<never, never, Z>
  <K, V, Z>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => Z): STM<never, never, Z>
}
```

Added in v2.0.0

## reduceWithIndexSTM

Atomically folds using a transactional function.

**Signature**

```ts
export declare const reduceWithIndexSTM: {
  <Z, V, K, R, E>(zero: Z, f: (acc: Z, value: V, key: K) => STM<R, E, Z>): (self: TMap<K, V>) => STM<R, E, Z>
  <Z, V, K, R, E>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => STM<R, E, Z>): STM<R, E, Z>
}
```

Added in v2.0.0

# getters

## isEmpty

Tests if the map is empty or not.

**Signature**

```ts
export declare const isEmpty: <K, V>(self: TMap<K, V>) => STM<never, never, boolean>
```

Added in v2.0.0

## size

Returns the number of bindings.

**Signature**

```ts
export declare const size: <K, V>(self: TMap<K, V>) => STM<never, never, number>
```

Added in v2.0.0

# models

## TMap (interface)

Transactional map implemented on top of `TRef` and `TArray`. Resolves
conflicts via chaining.

**Signature**

```ts
export interface TMap<K, V> extends TMap.Variance<K, V> {}
```

Added in v2.0.0

# mutations

## merge

If the key is not already associated with a value, stores the provided value,
otherwise merge the existing value with the new one using function `f` and
store the result.

**Signature**

```ts
export declare const merge: {
  <K, V>(key: K, value: V, f: (x: V, y: V) => V): (self: TMap<K, V>) => STM<never, never, V>
  <K, V>(self: TMap<K, V>, key: K, value: V, f: (x: V, y: V) => V): STM<never, never, V>
}
```

Added in v2.0.0

## remove

Removes binding for given key.

**Signature**

```ts
export declare const remove: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K): STM<never, never, void>
}
```

Added in v2.0.0

## removeAll

Deletes all entries associated with the specified keys.

**Signature**

```ts
export declare const removeAll: {
  <K>(keys: Iterable<K>): <V>(self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, keys: Iterable<K>): STM<never, never, void>
}
```

Added in v2.0.0

## removeIf

Removes bindings matching predicate and returns the removed entries.

**Signature**

```ts
export declare const removeIf: {
  <K, V>(predicate: (key: K, value: V) => boolean): (self: TMap<K, V>) => STM<never, never, (readonly [K, V])[]>
  <K, V>(self: TMap<K, V>, predicate: (key: K, value: V) => boolean): STM<never, never, (readonly [K, V])[]>
}
```

Added in v2.0.0

## removeIfDiscard

Removes bindings matching predicate.

**Signature**

```ts
export declare const removeIfDiscard: {
  <K, V>(predicate: (key: K, value: V) => boolean): (self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, predicate: (key: K, value: V) => boolean): STM<never, never, void>
}
```

Added in v2.0.0

## retainIf

Retains bindings matching predicate and returns removed bindings.

**Signature**

```ts
export declare const retainIf: {
  <K, V>(predicate: (key: K, value: V) => boolean): (self: TMap<K, V>) => STM<never, never, (readonly [K, V])[]>
  <K, V>(self: TMap<K, V>, predicate: (key: K, value: V) => boolean): STM<never, never, (readonly [K, V])[]>
}
```

Added in v2.0.0

## retainIfDiscard

Retains bindings matching predicate.

**Signature**

```ts
export declare const retainIfDiscard: {
  <K, V>(predicate: (key: K, value: V) => boolean): (self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, predicate: (key: K, value: V) => boolean): STM<never, never, void>
}
```

Added in v2.0.0

## set

Stores new binding into the map.

**Signature**

```ts
export declare const set: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM<never, never, void>
}
```

Added in v2.0.0

## setIfAbsent

Stores new binding in the map if it does not already exist.

**Signature**

```ts
export declare const setIfAbsent: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM<never, never, void>
}
```

Added in v2.0.0

## takeFirst

Takes the first matching value, or retries until there is one.

**Signature**

```ts
export declare const takeFirst: {
  <K, V, A>(pf: (key: K, value: V) => Option<A>): (self: TMap<K, V>) => STM<never, never, A>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option<A>): STM<never, never, A>
}
```

Added in v2.0.0

## takeFirstSTM

Takes the first matching value, or retries until there is one.

**Signature**

```ts
export declare const takeFirstSTM: {
  <K, V, R, E, A>(pf: (key: K, value: V) => STM<R, Option<E>, A>): (self: TMap<K, V>) => STM<R, E, A>
  <K, V, R, E, A>(self: TMap<K, V>, pf: (key: K, value: V) => STM<R, Option<E>, A>): STM<R, E, A>
}
```

Added in v2.0.0

## takeSome

Takes all matching values, or retries until there is at least one.

**Signature**

```ts
export declare const takeSome: {
  <K, V, A>(pf: (key: K, value: V) => Option<A>): (self: TMap<K, V>) => STM<never, never, [A, ...A[]]>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option<A>): STM<never, never, [A, ...A[]]>
}
```

Added in v2.0.0

## takeSomeSTM

Takes all matching values, or retries until there is at least one.

**Signature**

```ts
export declare const takeSomeSTM: {
  <K, V, R, E, A>(
    pf: (key: K, value: V) => STM<R, Option<E>, A>
  ): (self: TMap<K, V>) => STM<R, E, [A, ...A[]]>
  <K, V, R, E, A>(
    self: TMap<K, V>,
    pf: (key: K, value: V) => STM<R, Option<E>, A>
  ): STM<R, E, [A, ...A[]]>
}
```

Added in v2.0.0

## transform

Atomically updates all bindings using a pure function.

**Signature**

```ts
export declare const transform: {
  <K, V>(f: (key: K, value: V) => readonly [K, V]): (self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, f: (key: K, value: V) => readonly [K, V]): STM<never, never, void>
}
```

Added in v2.0.0

## transformSTM

Atomically updates all bindings using a transactional function.

**Signature**

```ts
export declare const transformSTM: {
  <K, V, R, E>(f: (key: K, value: V) => STM<R, E, readonly [K, V]>): (self: TMap<K, V>) => STM<R, E, void>
  <K, V, R, E>(self: TMap<K, V>, f: (key: K, value: V) => STM<R, E, readonly [K, V]>): STM<R, E, void>
}
```

Added in v2.0.0

## transformValues

Atomically updates all values using a pure function.

**Signature**

```ts
export declare const transformValues: {
  <V>(f: (value: V) => V): <K>(self: TMap<K, V>) => STM<never, never, void>
  <K, V>(self: TMap<K, V>, f: (value: V) => V): STM<never, never, void>
}
```

Added in v2.0.0

## transformValuesSTM

Atomically updates all values using a transactional function.

**Signature**

```ts
export declare const transformValuesSTM: {
  <V, R, E>(f: (value: V) => STM<R, E, V>): <K>(self: TMap<K, V>) => STM<R, E, void>
  <K, V, R, E>(self: TMap<K, V>, f: (value: V) => STM<R, E, V>): STM<R, E, void>
}
```

Added in v2.0.0

## updateWith

Updates the mapping for the specified key with the specified function,
which takes the current value of the key as an input, if it exists, and
either returns `Some` with a new value to indicate to update the value in
the map or `None` to remove the value from the map. Returns `Some` with the
updated value or `None` if the value was removed from the map.

**Signature**

```ts
export declare const updateWith: {
  <K, V>(
    key: K,
    f: (value: Option<V>) => Option<V>
  ): (self: TMap<K, V>) => STM<never, never, Option<V>>
  <K, V>(
    self: TMap<K, V>,
    key: K,
    f: (value: Option<V>) => Option<V>
  ): STM<never, never, Option<V>>
}
```

Added in v2.0.0

# symbols

## TMapTypeId

**Signature**

```ts
export declare const TMapTypeId: typeof TMapTypeId
```

Added in v2.0.0

## TMapTypeId (type alias)

**Signature**

```ts
export type TMapTypeId = typeof TMapTypeId
```

Added in v2.0.0

# utils

## TMap (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<K, V> {
  readonly [TMapTypeId]: {
    readonly _K: (_: never) => K
    readonly _V: (_: never) => V
  }
}
```

Added in v2.0.0
