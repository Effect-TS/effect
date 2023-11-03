---
title: Duration.ts
nav_order: 22
parent: Modules
---

## Duration overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [days](#days)
  - [hours](#hours)
  - [infinity](#infinity)
  - [micros](#micros)
  - [millis](#millis)
  - [minutes](#minutes)
  - [nanos](#nanos)
  - [seconds](#seconds)
  - [weeks](#weeks)
  - [zero](#zero)
- [getters](#getters)
  - [toHrTime](#tohrtime)
  - [toMillis](#tomillis)
  - [toNanos](#tonanos)
  - [toSeconds](#toseconds)
  - [unsafeToNanos](#unsafetonanos)
- [guards](#guards)
  - [isDuration](#isduration)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [sum](#sum)
  - [times](#times)
- [models](#models)
  - [Duration (interface)](#duration-interface)
  - [DurationInput (type alias)](#durationinput-type-alias)
  - [DurationValue (type alias)](#durationvalue-type-alias)
  - [Unit (type alias)](#unit-type-alias)
- [pattern matching](#pattern-matching)
  - [match](#match)
  - [matchWith](#matchwith)
- [predicates](#predicates)
  - [between](#between)
  - [equals](#equals)
  - [greaterThan](#greaterthan)
  - [greaterThanOrEqualTo](#greaterthanorequalto)
  - [lessThan](#lessthan)
  - [lessThanOrEqualTo](#lessthanorequalto)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [utils](#utils)
  - [clamp](#clamp)
  - [decode](#decode)
  - [max](#max)
  - [min](#min)

---

# constructors

## days

**Signature**

```ts
export declare const days: (days: number) => Duration
```

Added in v2.0.0

## hours

**Signature**

```ts
export declare const hours: (hours: number) => Duration
```

Added in v2.0.0

## infinity

**Signature**

```ts
export declare const infinity: Duration
```

Added in v2.0.0

## micros

**Signature**

```ts
export declare const micros: (micros: bigint) => Duration
```

Added in v2.0.0

## millis

**Signature**

```ts
export declare const millis: (millis: number) => Duration
```

Added in v2.0.0

## minutes

**Signature**

```ts
export declare const minutes: (minutes: number) => Duration
```

Added in v2.0.0

## nanos

**Signature**

```ts
export declare const nanos: (nanos: bigint) => Duration
```

Added in v2.0.0

## seconds

**Signature**

```ts
export declare const seconds: (seconds: number) => Duration
```

Added in v2.0.0

## weeks

**Signature**

```ts
export declare const weeks: (weeks: number) => Duration
```

Added in v2.0.0

## zero

**Signature**

```ts
export declare const zero: Duration
```

Added in v2.0.0

# getters

## toHrTime

**Signature**

```ts
export declare const toHrTime: (self: DurationInput) => readonly [seconds: number, nanos: number]
```

Added in v2.0.0

## toMillis

**Signature**

```ts
export declare const toMillis: (self: DurationInput) => number
```

Added in v2.0.0

## toNanos

Get the duration in nanoseconds as a bigint.

If the duration is infinite, returns `Option.none()`

**Signature**

```ts
export declare const toNanos: (self: DurationInput) => Option.Option<bigint>
```

Added in v2.0.0

## toSeconds

**Signature**

```ts
export declare const toSeconds: (self: DurationInput) => number
```

Added in v2.0.0

## unsafeToNanos

Get the duration in nanoseconds as a bigint.

If the duration is infinite, it throws an error.

**Signature**

```ts
export declare const unsafeToNanos: (self: DurationInput) => bigint
```

Added in v2.0.0

# guards

## isDuration

**Signature**

```ts
export declare const isDuration: (u: unknown) => u is Duration
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<Duration>
```

Added in v2.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<Duration>
```

Added in v2.0.0

# math

## sum

**Signature**

```ts
export declare const sum: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
}
```

Added in v2.0.0

## times

**Signature**

```ts
export declare const times: {
  (times: number): (self: DurationInput) => Duration
  (self: DurationInput, times: number): Duration
}
```

Added in v2.0.0

# models

## Duration (interface)

**Signature**

```ts
export interface Duration extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: DurationValue
}
```

Added in v2.0.0

## DurationInput (type alias)

**Signature**

```ts
export type DurationInput =
  | Duration
  | number // millis
  | bigint // nanos
  | `${number} ${Unit}`
```

Added in v2.0.0

## DurationValue (type alias)

**Signature**

```ts
export type DurationValue = { _tag: "Millis"; millis: number } | { _tag: "Nanos"; nanos: bigint } | { _tag: "Infinity" }
```

Added in v2.0.0

## Unit (type alias)

**Signature**

```ts
export type Unit = "nanos" | "micros" | "millis" | "seconds" | "minutes" | "hours" | "days" | "weeks"
```

Added in v2.0.0

# pattern matching

## match

**Signature**

```ts
export declare const match: {
  <A, B>(options: {
    readonly onMillis: (millis: number) => A
    readonly onNanos: (nanos: bigint) => B
  }): (self: DurationInput) => A | B
  <A, B>(
    self: DurationInput,
    options: { readonly onMillis: (millis: number) => A; readonly onNanos: (nanos: bigint) => B },
  ): A | B
}
```

Added in v2.0.0

## matchWith

**Signature**

```ts
export declare const matchWith: {
  <A, B>(
    that: DurationInput,
    options: {
      readonly onMillis: (self: number, that: number) => A
      readonly onNanos: (self: bigint, that: bigint) => B
    },
  ): (self: DurationInput) => A | B
  <A, B>(
    self: DurationInput,
    that: DurationInput,
    options: {
      readonly onMillis: (self: number, that: number) => A
      readonly onNanos: (self: bigint, that: bigint) => B
    },
  ): A | B
}
```

Added in v2.0.0

# predicates

## between

Checks if a `Duration` is between a `minimum` and `maximum` value.

**Signature**

```ts
export declare const between: {
  (minimum: DurationInput, maximum: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, minimum: DurationInput, maximum: DurationInput): boolean
}
```

Added in v2.0.0

## equals

**Signature**

```ts
export declare const equals: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
}
```

Added in v2.0.0

## greaterThan

**Signature**

```ts
export declare const greaterThan: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
}
```

Added in v2.0.0

## greaterThanOrEqualTo

**Signature**

```ts
export declare const greaterThanOrEqualTo: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
}
```

Added in v2.0.0

## lessThan

**Signature**

```ts
export declare const lessThan: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
}
```

Added in v2.0.0

## lessThanOrEqualTo

**Signature**

```ts
export declare const lessThanOrEqualTo: {
  (that: DurationInput): (self: DurationInput) => boolean
  (self: DurationInput, that: DurationInput): boolean
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

# utils

## clamp

**Signature**

```ts
export declare const clamp: {
  (minimum: DurationInput, maximum: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, minimum: DurationInput, maximum: DurationInput): Duration
}
```

Added in v2.0.0

## decode

**Signature**

```ts
export declare const decode: (input: DurationInput) => Duration
```

Added in v2.0.0

## max

**Signature**

```ts
export declare const max: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
}
```

Added in v2.0.0

## min

**Signature**

```ts
export declare const min: {
  (that: DurationInput): (self: DurationInput) => Duration
  (self: DurationInput, that: DurationInput): Duration
}
```

Added in v2.0.0
