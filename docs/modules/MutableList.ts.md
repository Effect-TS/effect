---
title: MutableList.ts
nav_order: 60
parent: Modules
---

## MutableList overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [concatenating](#concatenating)
  - [append](#append)
  - [prepend](#prepend)
- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [getters](#getters)
  - [head](#head)
  - [isEmpty](#isempty)
  - [length](#length)
  - [tail](#tail)
- [model](#model)
  - [MutableList (interface)](#mutablelist-interface)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
- [utils](#utils)
  - [pop](#pop)
  - [reset](#reset)
  - [shift](#shift)

---

# concatenating

## append

Appends the specified element to the end of the `MutableList`.

**Signature**

```ts
export declare const append: {
  <A>(value: A): (self: MutableList<A>) => MutableList<A>
  <A>(self: MutableList<A>, value: A): MutableList<A>
}
```

Added in v1.0.0

## prepend

Prepends the specified value to the beginning of the list.

**Signature**

```ts
export declare const prepend: {
  <A>(value: A): (self: MutableList<A>) => MutableList<A>
  <A>(self: MutableList<A>, value: A): MutableList<A>
}
```

Added in v1.0.0

# constructors

## empty

Creates an empty `MutableList`.

**Signature**

```ts
export declare const empty: <A>() => MutableList<A>
```

Added in v1.0.0

## fromIterable

Creates a new `MutableList` from an `Iterable`.

**Signature**

```ts
export declare const fromIterable: <A>(iterable: Iterable<A>) => MutableList<A>
```

Added in v1.0.0

## make

Creates a new `MutableList` from the specified elements.

**Signature**

```ts
export declare const make: <A>(...elements: readonly A[]) => MutableList<A>
```

Added in v1.0.0

# getters

## head

Returns the first element of the list, if it exists.

**Signature**

```ts
export declare const head: <A>(self: MutableList<A>) => A | undefined
```

Added in v1.0.0

## isEmpty

Returns `true` if the list contains zero elements, `false`, otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: MutableList<A>) => boolean
```

Added in v1.0.0

## length

Returns the length of the list.

**Signature**

```ts
export declare const length: <A>(self: MutableList<A>) => number
```

Added in v1.0.0

## tail

Returns the last element of the list, if it exists.

**Signature**

```ts
export declare const tail: <A>(self: MutableList<A>) => A | undefined
```

Added in v1.0.0

# model

## MutableList (interface)

**Signature**

```ts
export interface MutableList<A> extends Iterable<A>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  head: LinkedListNode<A> | undefined
  /** @internal */
  tail: LinkedListNode<A> | undefined
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

Executes the specified function `f` for each element in the list.

**Signature**

```ts
export declare const forEach: {
  <A>(f: (element: A) => void): (self: MutableList<A>) => void
  <A>(self: MutableList<A>, f: (element: A) => void): void
}
```

Added in v1.0.0

# utils

## pop

Removes the last value from the list and returns it, if it exists.

**Signature**

```ts
export declare const pop: <A>(self: MutableList<A>) => A | undefined
```

Added in v0.0.1

## reset

Removes all elements from the doubly-linked list.

**Signature**

```ts
export declare const reset: <A>(self: MutableList<A>) => MutableList<A>
```

Added in v1.0.0

## shift

Removes the first value from the list and returns it, if it exists.

**Signature**

```ts
export declare const shift: <A>(self: MutableList<A>) => A | undefined
```

Added in v0.0.1
