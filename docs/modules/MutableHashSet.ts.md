---
title: MutableHashSet.ts
nav_order: 69
parent: Modules
---

## MutableHashSet overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [add](#add)
  - [has](#has)
  - [remove](#remove)
  - [size](#size)
- [models](#models)
  - [MutableHashSet (interface)](#mutablehashset-interface)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: <K = never>() => MutableHashSet<K>
```

Added in v2.0.0

## fromIterable

**Signature**

```ts
export declare const fromIterable: <K = never>(keys: Iterable<K>) => MutableHashSet<K>
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <Keys extends readonly unknown[]>(...keys: Keys) => MutableHashSet<Keys[number]>
```

Added in v2.0.0

# elements

## add

**Signature**

```ts
export declare const add: {
  <V>(key: V): (self: MutableHashSet<V>) => MutableHashSet<V>
  <V>(self: MutableHashSet<V>, key: V): MutableHashSet<V>
}
```

Added in v2.0.0

## has

**Signature**

```ts
export declare const has: {
  <V>(key: V): (self: MutableHashSet<V>) => boolean
  <V>(self: MutableHashSet<V>, key: V): boolean
}
```

Added in v2.0.0

## remove

**Signature**

```ts
export declare const remove: {
  <V>(key: V): (self: MutableHashSet<V>) => MutableHashSet<V>
  <V>(self: MutableHashSet<V>, key: V): MutableHashSet<V>
}
```

Added in v2.0.0

## size

**Signature**

```ts
export declare const size: <V>(self: MutableHashSet<V>) => number
```

Added in v2.0.0

# models

## MutableHashSet (interface)

**Signature**

```ts
export interface MutableHashSet<V> extends Iterable<V>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly keyMap: MutableHashMap.MutableHashMap<V, boolean>
}
```

Added in v2.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0
