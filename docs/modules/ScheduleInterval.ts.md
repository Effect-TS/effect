---
title: ScheduleInterval.ts
nav_order: 96
parent: Modules
---

## ScheduleInterval overview

Added in v2.0.0

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
  - [ScheduleInterval (interface)](#interval-interface)
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

Construct an `ScheduleInterval` that includes all time equal to and after the
specified start time.

**Signature**

```ts
export declare const after: (startMilliseconds: number) => ScheduleInterval
```

Added in v2.0.0

## before

Construct an `ScheduleInterval` that includes all time equal to and before the
specified end time.

**Signature**

```ts
export declare const before: (endMilliseconds: number) => ScheduleInterval
```

Added in v2.0.0

## empty

An `ScheduleInterval` of zero-width.

**Signature**

```ts
export declare const empty: ScheduleInterval
```

Added in v2.0.0

## make

Constructs a new interval from the two specified endpoints. If the start
endpoint greater than the end endpoint, then a zero size interval will be
returned.

**Signature**

```ts
export declare const make: (startMillis: number, endMillis: number) => ScheduleInterval
```

Added in v2.0.0

# getters

## size

Calculates the size of the `ScheduleInterval` as the `Duration` from the start of the
interval to the end of the interval.

**Signature**

```ts
export declare const size: (self: ScheduleInterval) => Duration
```

Added in v2.0.0

# models

## ScheduleInterval (interface)

An `ScheduleInterval` represents an interval of time. ScheduleIntervals can encompass all
time, or no time at all.

**Signature**

```ts
export interface ScheduleInterval {
  readonly [IntervalTypeId]: IntervalTypeId
  readonly startMillis: number
  readonly endMillis: number
}
```

Added in v2.0.0

# ordering

## intersect

Computes a new `ScheduleInterval` which is the intersection of this `ScheduleInterval` and
that `ScheduleInterval`.

**Signature**

```ts
export declare const intersect: {
  (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval
  (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval
}
```

Added in v2.0.0

## isEmpty

Returns `true` if the specified `ScheduleInterval` is empty, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: (self: ScheduleInterval) => boolean
```

Added in v2.0.0

## isNonEmpty

Returns `true` if the specified `ScheduleInterval` is non-empty, `false` otherwise.

**Signature**

```ts
export declare const isNonEmpty: (self: ScheduleInterval) => boolean
```

Added in v2.0.0

## lessThan

Returns `true` if this `ScheduleInterval` is less than `that` interval, `false`
otherwise.

**Signature**

```ts
export declare const lessThan: {
  (that: ScheduleInterval): (self: ScheduleInterval) => boolean
  (self: ScheduleInterval, that: ScheduleInterval): boolean
}
```

Added in v2.0.0

## max

Returns the maximum of two `ScheduleInterval`s.

**Signature**

```ts
export declare const max: { (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval; (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval }
```

Added in v2.0.0

## min

Returns the minimum of two `ScheduleInterval`s.

**Signature**

```ts
export declare const min: { (that: ScheduleInterval): (self: ScheduleInterval) => ScheduleInterval; (self: ScheduleInterval, that: ScheduleInterval): ScheduleInterval }
```

Added in v2.0.0

# symbols

## IntervalTypeId

**Signature**

```ts
export declare const IntervalTypeId: typeof IntervalTypeId
```

Added in v2.0.0

## IntervalTypeId (type alias)

**Signature**

```ts
export type IntervalTypeId = typeof IntervalTypeId
```

Added in v2.0.0

# utils

## union

Computes a new `ScheduleInterval` which is the union of this `ScheduleInterval` and that
`ScheduleInterval` as a `Some`, otherwise returns `None` if the two intervals cannot
form a union.

**Signature**

```ts
export declare const union: {
  (that: ScheduleInterval): (self: ScheduleInterval) => Option<ScheduleInterval>
  (self: ScheduleInterval, that: ScheduleInterval): Option<ScheduleInterval>
}
```

Added in v2.0.0
