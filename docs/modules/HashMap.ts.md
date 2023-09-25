---
title: HashMap.ts
nav_order: 36
parent: Modules
---

## HashMap overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [findFirst](#findfirst)
  - [get](#get)
  - [getHash](#gethash)
  - [has](#has)
  - [hasHash](#hashash)
  - [isEmpty](#isempty)
- [filtering](#filtering)
  - [compact](#compact)
  - [filter](#filter)
  - [filterMap](#filtermap)
- [folding](#folding)
  - [reduce](#reduce)
- [getter](#getter)
  - [keySet](#keyset)
- [getters](#getters)
  - [keys](#keys)
  - [size](#size)
  - [values](#values)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [HashMap (interface)](#hashmap-interface)
- [refinements](#refinements)
  - [isHashMap](#ishashmap)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
- [unsafe](#unsafe)
  - [unsafeGet](#unsafeget)
- [utils](#utils)
  - [HashMap (namespace)](#hashmap-namespace)
    - [UpdateFn (type alias)](#updatefn-type-alias)
  - [beginMutation](#beginmutation)
  - [endMutation](#endmutation)
  - [modify](#modify)
  - [modifyAt](#modifyat)
  - [modifyHash](#modifyhash)
  - [mutate](#mutate)
  - [remove](#remove)
  - [removeMany](#removemany)
  - [set](#set)
  - [union](#union)

---

# constructors

## empty

Creates a new `HashMap`.

**Signature**

```ts
export declare const empty: <K = never, V = never>() => HashMap<K, V>
```

Added in v1.0.0

## fromIterable

Constructs a new `HashMap` from an iterable of key/value pairs.

**Signature**

```ts
export declare const fromIterable: <K, V>(entries: Iterable<readonly [K, V]>) => HashMap<K, V>
```

Added in v1.0.0

## make

Constructs a new `HashMap` from an array of key/value pairs.

**Signature**

```ts
export declare const make: <Entries extends readonly (readonly [any, any])[]>(
  ...entries: Entries
) => HashMap<
  Entries[number] extends readonly [infer K, any] ? K : never,
  Entries[number] extends readonly [any, infer V] ? V : never
>
```

Added in v1.0.0

# elements

## findFirst

Returns the first element that satisfies the specified
predicate, or `None` if no such element exists.

**Signature**

```ts
export declare const findFirst: {
  <K, A>(predicate: (k: K, a: A) => boolean): (self: HashMap<K, A>) => Option<[K, A]>
  <K, A>(self: HashMap<K, A>, predicate: (k: K, a: A) => boolean): Option<[K, A]>
}
```

Added in v1.0.0

## get

Safely lookup the value for the specified key in the `HashMap` using the
internal hashing function.

**Signature**

```ts
export declare const get: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => Option<V>
  <K, V, K1>(self: HashMap<K, V>, key: K1): Option<V>
}
```

Added in v1.0.0

## getHash

Lookup the value for the specified key in the `HashMap` using a custom hash.

**Signature**

```ts
export declare const getHash: {
  <K1>(key: K1, hash: number): <K, V>(self: HashMap<K, V>) => Option<V>
  <K, V, K1>(self: HashMap<K, V>, key: K1, hash: number): Option<V>
}
```

Added in v1.0.0

## has

Checks if the specified key has an entry in the `HashMap`.

**Signature**

```ts
export declare const has: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => boolean
  <K, V, K1>(self: HashMap<K, V>, key: K1): boolean
}
```

Added in v1.0.0

## hasHash

Checks if the specified key has an entry in the `HashMap` using a custom
hash.

**Signature**

```ts
export declare const hasHash: {
  <K1>(key: K1, hash: number): <K, V>(self: HashMap<K, V>) => boolean
  <K, V, K1>(self: HashMap<K, V>, key: K1, hash: number): boolean
}
```

Added in v1.0.0

## isEmpty

Checks if the `HashMap` contains any entries.

**Signature**

```ts
export declare const isEmpty: <K, V>(self: HashMap<K, V>) => boolean
```

Added in v1.0.0

# filtering

## compact

Filters out `None` values from a `HashMap` of `Options`s.

**Signature**

```ts
export declare const compact: <K, A>(self: HashMap<K, Option<A>>) => HashMap<K, A>
```

Added in v1.0.0

## filter

Filters entries out of a `HashMap` using the specified predicate.

**Signature**

```ts
export declare const filter: {
  <K, A, B extends A>(f: (a: A, k: K) => a is B): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A>(f: (a: A, k: K) => boolean): (self: HashMap<K, A>) => HashMap<K, A>
  <K, A, B extends A>(self: HashMap<K, A>, f: (a: A, k: K) => a is B): HashMap<K, B>
  <K, A>(self: HashMap<K, A>, f: (a: A, k: K) => boolean): HashMap<K, A>
}
```

Added in v1.0.0

## filterMap

Maps over the entries of the `HashMap` using the specified partial function
and filters out `None` values.

**Signature**

```ts
export declare const filterMap: {
  <A, K, B>(f: (value: A, key: K) => Option<B>): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A, B>(self: HashMap<K, A>, f: (value: A, key: K) => Option<B>): HashMap<K, B>
}
```

Added in v1.0.0

# folding

## reduce

Reduces the specified state over the entries of the `HashMap`.

**Signature**

```ts
export declare const reduce: {
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: HashMap<K, V>) => Z
  <Z, V, K>(self: HashMap<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
}
```

Added in v1.0.0

# getter

## keySet

Returns a `HashSet` of keys within the `HashMap`.

**Signature**

```ts
export declare const keySet: <K, V>(self: HashMap<K, V>) => HashSet<K>
```

Added in v1.0.0

# getters

## keys

Returns an `IterableIterator` of the keys within the `HashMap`.

**Signature**

```ts
export declare const keys: <K, V>(self: HashMap<K, V>) => IterableIterator<K>
```

Added in v1.0.0

## size

Returns the number of entries within the `HashMap`.

**Signature**

```ts
export declare const size: <K, V>(self: HashMap<K, V>) => number
```

Added in v1.0.0

## values

Returns an `IterableIterator` of the values within the `HashMap`.

**Signature**

```ts
export declare const values: <K, V>(self: HashMap<K, V>) => IterableIterator<V>
```

Added in v1.0.0

# mapping

## map

Maps over the entries of the `HashMap` using the specified function.

**Signature**

```ts
export declare const map: {
  <A, V, K>(f: (value: V, key: K) => A): (self: HashMap<K, V>) => HashMap<K, A>
  <K, V, A>(self: HashMap<K, V>, f: (value: V, key: K) => A): HashMap<K, A>
}
```

Added in v1.0.0

# models

## HashMap (interface)

**Signature**

```ts
export interface HashMap<Key, Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  [TypeId]: TypeId
}
```

Added in v1.0.0

# refinements

## isHashMap

**Signature**

```ts
export declare const isHashMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is HashMap<K, V>
  (u: unknown): u is HashMap<unknown, unknown>
}
```

Added in v1.0.0

# sequencing

## flatMap

Chains over the entries of the `HashMap` using the specified function.

**NOTE**: the hash and equal of both maps have to be the same.

**Signature**

```ts
export declare const flatMap: {
  <A, K, B>(f: (value: A, key: K) => HashMap<K, B>): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A, B>(self: HashMap<K, A>, f: (value: A, key: K) => HashMap<K, B>): HashMap<K, B>
}
```

Added in v1.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v1.0.0

# traversing

## forEach

Applies the specified function to the entries of the `HashMap`.

**Signature**

```ts
export declare const forEach: {
  <V, K>(f: (value: V, key: K) => void): (self: HashMap<K, V>) => void
  <V, K>(self: HashMap<K, V>, f: (value: V, key: K) => void): void
}
```

Added in v1.0.0

# unsafe

## unsafeGet

Unsafely lookup the value for the specified key in the `HashMap` using the
internal hashing function.

**Signature**

```ts
export declare const unsafeGet: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => V
  <K, V, K1>(self: HashMap<K, V>, key: K1): V
}
```

Added in v1.0.0

# utils

## HashMap (namespace)

Added in v1.0.0

### UpdateFn (type alias)

**Signature**

```ts
export type UpdateFn<V> = (option: Option<V>) => Option<V>
```

Added in v1.0.0

## beginMutation

Marks the `HashMap` as mutable.

**Signature**

```ts
export declare const beginMutation: <K, V>(self: HashMap<K, V>) => HashMap<K, V>
```

Added in v1.0.0

## endMutation

Marks the `HashMap` as immutable.

**Signature**

```ts
export declare const endMutation: <K, V>(self: HashMap<K, V>) => HashMap<K, V>
```

Added in v1.0.0

## modify

Updates the value of the specified key within the `HashMap` if it exists.

**Signature**

```ts
export declare const modify: {
  <K, V>(key: K, f: (v: V) => V): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, f: (v: V) => V): HashMap<K, V>
}
```

Added in v1.0.0

## modifyAt

Set or remove the specified key in the `HashMap` using the specified
update function. The value of the specified key will be computed using the
provided hash.

The update function will be invoked with the current value of the key if it
exists, or `None` if no such value exists.

**Signature**

```ts
export declare const modifyAt: {
  <K, V>(key: K, f: HashMap.UpdateFn<V>): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, f: HashMap.UpdateFn<V>): HashMap<K, V>
}
```

Added in v1.0.0

## modifyHash

Alter the value of the specified key in the `HashMap` using the specified
update function. The value of the specified key will be computed using the
provided hash.

The update function will be invoked with the current value of the key if it
exists, or `None` if no such value exists.

This function will always either update or insert a value into the `HashMap`.

**Signature**

```ts
export declare const modifyHash: {
  <K, V>(key: K, hash: number, f: HashMap.UpdateFn<V>): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, hash: number, f: HashMap.UpdateFn<V>): HashMap<K, V>
}
```

Added in v1.0.0

## mutate

Mutates the `HashMap` within the context of the provided function.

**Signature**

```ts
export declare const mutate: {
  <K, V>(f: (self: HashMap<K, V>) => void): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, f: (self: HashMap<K, V>) => void): HashMap<K, V>
}
```

Added in v1.0.0

## remove

Remove the entry for the specified key in the `HashMap` using the internal
hashing function.

**Signature**

```ts
export declare const remove: {
  <K>(key: K): <V>(self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K): HashMap<K, V>
}
```

Added in v1.0.0

## removeMany

Removes all entries in the `HashMap` which have the specified keys.

**Signature**

```ts
export declare const removeMany: {
  <K>(keys: Iterable<K>): <V>(self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, keys: Iterable<K>): HashMap<K, V>
}
```

Added in v1.0.0

## set

Sets the specified key to the specified value using the internal hashing
function.

**Signature**

```ts
export declare const set: {
  <K, V>(key: K, value: V): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, value: V): HashMap<K, V>
}
```

Added in v1.0.0

## union

Performs a union of this `HashMap` and that `HashMap`.

**Signature**

```ts
export declare const union: {
  <K1, V1>(that: HashMap<K1, V1>): <K0, V0>(self: HashMap<K0, V0>) => HashMap<K1 | K0, V1 | V0>
  <K0, V0, K1, V1>(self: HashMap<K0, V0>, that: HashMap<K1, V1>): HashMap<K0 | K1, V0 | V1>
}
```

Added in v1.0.0
