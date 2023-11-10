---
title: Order.ts
nav_order: 74
parent: Modules
---

## Order overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [array](#array)
  - [mapInput](#mapinput)
  - [struct](#struct)
  - [tuple](#tuple)
- [combining](#combining)
  - [all](#all)
  - [combine](#combine)
  - [combineAll](#combineall)
  - [combineMany](#combinemany)
  - [product](#product)
  - [productMany](#productmany)
- [constructors](#constructors)
  - [make](#make)
- [instances](#instances)
  - [Date](#date)
  - [bigint](#bigint)
  - [boolean](#boolean)
  - [number](#number)
  - [string](#string)
- [type class](#type-class)
  - [Order (interface)](#order-interface)
- [type lambdas](#type-lambdas)
  - [OrderTypeLambda (interface)](#ordertypelambda-interface)
- [utils](#utils)
  - [between](#between)
  - [clamp](#clamp)
  - [empty](#empty)
  - [greaterThan](#greaterthan)
  - [greaterThanOrEqualTo](#greaterthanorequalto)
  - [lessThan](#lessthan)
  - [lessThanOrEqualTo](#lessthanorequalto)
  - [max](#max)
  - [min](#min)
  - [reverse](#reverse)

---

# combinators

## array

This function creates and returns a new `Order` for an array of values based on a given `Order` for the elements of the array.
The returned `Order` compares two arrays by applying the given `Order` to each element in the arrays.
If all elements are equal, the arrays are then compared based on their length.
It is useful when you need to compare two arrays of the same type and you have a specific way of comparing each element of the array.

**Signature**

```ts
export declare const array: <A>(O: Order<A>) => Order<readonly A[]>
```

Added in v2.0.0

## mapInput

**Signature**

```ts
export declare const mapInput: {
  <B, A>(f: (b: B) => A): (self: Order<A>) => Order<B>
  <A, B>(self: Order<A>, f: (b: B) => A): Order<B>
}
```

Added in v2.0.0

## struct

This function creates and returns a new `Order` for a struct of values based on the given `Order`s
for each property in the struct.

**Signature**

```ts
export declare const struct: <R extends { readonly [x: string]: Order<any> }>(
  fields: R
) => Order<{ [K in keyof R]: [R[K]] extends [Order<infer A>] ? A : never }>
```

Added in v2.0.0

## tuple

Similar to `Promise.all` but operates on `Order`s.

```
[Order<A>, Order<B>, ...] -> Order<[A, B, ...]>
```

This function creates and returns a new `Order` for a tuple of values based on the given `Order`s for each element in the tuple.
The returned `Order` compares two tuples of the same type by applying the corresponding `Order` to each element in the tuple.
It is useful when you need to compare two tuples of the same type and you have a specific way of comparing each element
of the tuple.

**Signature**

```ts
export declare const tuple: <T extends readonly Order<any>[]>(
  ...elements: T
) => Order<Readonly<{ [I in keyof T]: [T[I]] extends [Order<infer A>] ? A : never }>>
```

Added in v2.0.0

# combining

## all

**Signature**

```ts
export declare const all: <A>(collection: Iterable<Order<A>>) => Order<readonly A[]>
```

Added in v2.0.0

## combine

**Signature**

```ts
export declare const combine: {
  <A>(that: Order<A>): (self: Order<A>) => Order<A>
  <A>(self: Order<A>, that: Order<A>): Order<A>
}
```

Added in v2.0.0

## combineAll

**Signature**

```ts
export declare const combineAll: <A>(collection: Iterable<Order<A>>) => Order<A>
```

Added in v2.0.0

## combineMany

**Signature**

```ts
export declare const combineMany: {
  <A>(collection: Iterable<Order<A>>): (self: Order<A>) => Order<A>
  <A>(self: Order<A>, collection: Iterable<Order<A>>): Order<A>
}
```

Added in v2.0.0

## product

**Signature**

```ts
export declare const product: {
  <B>(that: Order<B>): <A>(self: Order<A>) => Order<readonly [A, B]>
  <A, B>(self: Order<A>, that: Order<B>): Order<readonly [A, B]>
}
```

Added in v2.0.0

## productMany

**Signature**

```ts
export declare const productMany: {
  <A>(collection: Iterable<Order<A>>): (self: Order<A>) => Order<readonly [A, ...A[]]>
  <A>(self: Order<A>, collection: Iterable<Order<A>>): Order<readonly [A, ...A[]]>
}
```

Added in v2.0.0

# constructors

## make

**Signature**

```ts
export declare const make: <A>(compare: (self: A, that: A) => -1 | 0 | 1) => Order<A>
```

Added in v2.0.0

# instances

## Date

**Signature**

```ts
export declare const Date: Order<Date>
```

Added in v2.0.0

## bigint

**Signature**

```ts
export declare const bigint: Order<bigint>
```

Added in v2.0.0

## boolean

**Signature**

```ts
export declare const boolean: Order<boolean>
```

Added in v2.0.0

## number

**Signature**

```ts
export declare const number: Order<number>
```

Added in v2.0.0

## string

**Signature**

```ts
export declare const string: Order<string>
```

Added in v2.0.0

# type class

## Order (interface)

**Signature**

```ts
export interface Order<A> {
  (self: A, that: A): -1 | 0 | 1
}
```

Added in v2.0.0

# type lambdas

## OrderTypeLambda (interface)

**Signature**

```ts
export interface OrderTypeLambda extends TypeLambda {
  readonly type: Order<this["Target"]>
}
```

Added in v2.0.0

# utils

## between

Test whether a value is between a minimum and a maximum (inclusive).

**Signature**

```ts
export declare const between: <A>(O: Order<A>) => {
  (options: { minimum: A; maximum: A }): (self: A) => boolean
  (self: A, options: { minimum: A; maximum: A }): boolean
}
```

Added in v2.0.0

## clamp

Clamp a value between a minimum and a maximum.

**Signature**

```ts
export declare const clamp: <A>(O: Order<A>) => {
  (options: { minimum: A; maximum: A }): (self: A) => A
  (self: A, options: { minimum: A; maximum: A }): A
}
```

**Example**

```ts
import * as Order from "effect/Order"
import * as Number from "effect/Number"

const clamp = Order.clamp(Number.Order)({ minimum: 1, maximum: 5 })

assert.equal(clamp(3), 3)
assert.equal(clamp(0), 1)
assert.equal(clamp(6), 5)
```

Added in v2.0.0

## empty

**Signature**

```ts
export declare const empty: <A>() => Order<A>
```

Added in v2.0.0

## greaterThan

Test whether one value is _strictly greater than_ another.

**Signature**

```ts
export declare const greaterThan: <A>(O: Order<A>) => { (that: A): (self: A) => boolean; (self: A, that: A): boolean }
```

Added in v2.0.0

## greaterThanOrEqualTo

Test whether one value is _non-strictly greater than_ another.

**Signature**

```ts
export declare const greaterThanOrEqualTo: <A>(O: Order<A>) => {
  (that: A): (self: A) => boolean
  (self: A, that: A): boolean
}
```

Added in v2.0.0

## lessThan

Test whether one value is _strictly less than_ another.

**Signature**

```ts
export declare const lessThan: <A>(O: Order<A>) => { (that: A): (self: A) => boolean; (self: A, that: A): boolean }
```

Added in v2.0.0

## lessThanOrEqualTo

Test whether one value is _non-strictly less than_ another.

**Signature**

```ts
export declare const lessThanOrEqualTo: <A>(O: Order<A>) => {
  (that: A): (self: A) => boolean
  (self: A, that: A): boolean
}
```

Added in v2.0.0

## max

Take the maximum of two values. If they are considered equal, the first argument is chosen.

**Signature**

```ts
export declare const max: <A>(O: Order<A>) => { (that: A): (self: A) => A; (self: A, that: A): A }
```

Added in v2.0.0

## min

Take the minimum of two values. If they are considered equal, the first argument is chosen.

**Signature**

```ts
export declare const min: <A>(O: Order<A>) => { (that: A): (self: A) => A; (self: A, that: A): A }
```

Added in v2.0.0

## reverse

**Signature**

```ts
export declare const reverse: <A>(O: Order<A>) => Order<A>
```

Added in v2.0.0
