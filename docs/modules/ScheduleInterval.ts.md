---
title: ScheduleInterval.ts
nav_order: 89
parent: Modules
---

## ScheduleInterval overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [after](#after)
  - [before](#before)
  - [empty](#empty)
  - [make](#make)
- [getters](#getters)
  - [size](#size)
- [models](#models)
  - [Interval (interface)](#interval-interface)
- [ordering](#ordering)
  - [intersect](#intersect)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [lessThan](#lessthan)
  - [max](#max)
  - [min](#min)
- [symbols](#symbols)
  - [IntervalTypeId](#intervaltypeid)
  - [IntervalTypeId (type alias)](#intervaltypeid-type-alias)
- [utils](#utils)
  - [union](#union)

---

# constructors

## after

Construct an `Interval` that includes all time equal to and after the
specified start time.

**Signature**

```ts
export declare const after: (startMilliseconds: number) => Interval
```

Added in v1.0.0

## before

Construct an `Interval` that includes all time equal to and before the
specified end time.

**Signature**

```ts
export declare const before: (endMilliseconds: number) => Interval
```

Added in v1.0.0

## empty

An `Interval` of zero-width.

**Signature**

```ts
export declare const empty: Interval
```

Added in v1.0.0

## make

Constructs a new interval from the two specified endpoints. If the start
endpoint greater than the end endpoint, then a zero size interval will be
returned.

**Signature**

```ts
export declare const make: (startMillis: number, endMillis: number) => Interval
```

Added in v1.0.0

# getters

## size

Calculates the size of the `Interval` as the `Duration` from the start of the
interval to the end of the interval.

**Signature**

```ts
export declare const size: (self: Interval) => Duration.Duration
```

Added in v1.0.0

# models

## Interval (interface)

An `Interval` represents an interval of time. Intervals can encompass all
time, or no time at all.

**Signature**

```ts
export interface Interval {
  readonly [IntervalTypeId]: IntervalTypeId
  readonly startMillis: number
  readonly endMillis: number
}
```

Added in v1.0.0

# ordering

## intersect

Computes a new `Interval` which is the intersection of this `Interval` and
that `Interval`.

**Signature**

```ts
export declare const intersect: {
  (that: Interval): (self: Interval) => Interval
  (self: Interval, that: Interval): Interval
}
```

Added in v1.0.0

## isEmpty

Returns `true` if the specified `Interval` is empty, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: (self: Interval) => boolean
```

Added in v1.0.0

## isNonEmpty

Returns `true` if the specified `Interval` is non-empty, `false` otherwise.

**Signature**

```ts
export declare const isNonEmpty: (self: Interval) => boolean
```

Added in v1.0.0

## lessThan

Returns `true` if this `Interval` is less than `that` interval, `false`
otherwise.

**Signature**

```ts
export declare const lessThan: {
  (that: Interval): (self: Interval) => boolean
  (self: Interval, that: Interval): boolean
}
```

Added in v1.0.0

## max

Returns the maximum of two `Interval`s.

**Signature**

```ts
export declare const max: { (that: Interval): (self: Interval) => Interval; (self: Interval, that: Interval): Interval }
```

Added in v1.0.0

## min

Returns the minimum of two `Interval`s.

**Signature**

```ts
export declare const min: { (that: Interval): (self: Interval) => Interval; (self: Interval, that: Interval): Interval }
```

Added in v1.0.0

# symbols

## IntervalTypeId

**Signature**

```ts
export declare const IntervalTypeId: typeof IntervalTypeId
```

Added in v1.0.0

## IntervalTypeId (type alias)

**Signature**

```ts
export type IntervalTypeId = typeof IntervalTypeId
```

Added in v1.0.0

# utils

## union

Computes a new `Interval` which is the union of this `Interval` and that
`Interval` as a `Some`, otherwise returns `None` if the two intervals cannot
form a union.

**Signature**

```ts
export declare const union: {
  (that: Interval): (self: Interval) => Option.Option<Interval>
  (self: Interval, that: Interval): Option.Option<Interval>
}
```

Added in v1.0.0
