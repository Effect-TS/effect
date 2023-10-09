---
title: MutableRef.ts
nav_order: 72
parent: Modules
---

## MutableRef overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [boolean](#boolean)
  - [toggle](#toggle)
- [constructors](#constructors)
  - [make](#make)
- [general](#general)
  - [compareAndSet](#compareandset)
  - [get](#get)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [set](#set)
  - [setAndGet](#setandget)
  - [update](#update)
  - [updateAndGet](#updateandget)
- [models](#models)
  - [MutableRef (interface)](#mutableref-interface)
- [numeric](#numeric)
  - [decrement](#decrement)
  - [decrementAndGet](#decrementandget)
  - [getAndDecrement](#getanddecrement)
  - [getAndIncrement](#getandincrement)
  - [increment](#increment)
  - [incrementAndGet](#incrementandget)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)

---

# boolean

## toggle

**Signature**

```ts
export declare const toggle: (self: MutableRef<boolean>) => MutableRef<boolean>
```

Added in v2.0.0

# constructors

## make

**Signature**

```ts
export declare const make: <T>(value: T) => MutableRef<T>
```

Added in v2.0.0

# general

## compareAndSet

**Signature**

```ts
export declare const compareAndSet: {
  <T>(oldValue: T, newValue: T): (self: MutableRef<T>) => boolean
  <T>(self: MutableRef<T>, oldValue: T, newValue: T): boolean
}
```

Added in v2.0.0

## get

**Signature**

```ts
export declare const get: <T>(self: MutableRef<T>) => T
```

Added in v2.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: { <T>(value: T): (self: MutableRef<T>) => T; <T>(self: MutableRef<T>, value: T): T }
```

Added in v2.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <T>(f: (value: T) => T): (self: MutableRef<T>) => T
  <T>(self: MutableRef<T>, f: (value: T) => T): T
}
```

Added in v2.0.0

## set

**Signature**

```ts
export declare const set: {
  <T>(value: T): (self: MutableRef<T>) => MutableRef<T>
  <T>(self: MutableRef<T>, value: T): MutableRef<T>
}
```

Added in v2.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: { <T>(value: T): (self: MutableRef<T>) => T; <T>(self: MutableRef<T>, value: T): T }
```

Added in v2.0.0

## update

**Signature**

```ts
export declare const update: {
  <T>(f: (value: T) => T): (self: MutableRef<T>) => MutableRef<T>
  <T>(self: MutableRef<T>, f: (value: T) => T): MutableRef<T>
}
```

Added in v2.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <T>(f: (value: T) => T): (self: MutableRef<T>) => T
  <T>(self: MutableRef<T>, f: (value: T) => T): T
}
```

Added in v2.0.0

# models

## MutableRef (interface)

**Signature**

```ts
export interface MutableRef<T> extends Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  current: T
}
```

Added in v2.0.0

# numeric

## decrement

**Signature**

```ts
export declare const decrement: (self: MutableRef<number>) => MutableRef<number>
```

Added in v2.0.0

## decrementAndGet

**Signature**

```ts
export declare const decrementAndGet: (self: MutableRef<number>) => number
```

Added in v2.0.0

## getAndDecrement

**Signature**

```ts
export declare const getAndDecrement: (self: MutableRef<number>) => number
```

Added in v2.0.0

## getAndIncrement

**Signature**

```ts
export declare const getAndIncrement: (self: MutableRef<number>) => number
```

Added in v2.0.0

## increment

**Signature**

```ts
export declare const increment: (self: MutableRef<number>) => MutableRef<number>
```

Added in v2.0.0

## incrementAndGet

**Signature**

```ts
export declare const incrementAndGet: (self: MutableRef<number>) => number
```

Added in v2.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0
