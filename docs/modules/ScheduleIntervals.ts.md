---
title: ScheduleIntervals.ts
nav_order: 97
parent: Modules
---

## ScheduleIntervals overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [getters](#getters)
  - [end](#end)
  - [isNonEmpty](#isnonempty)
  - [start](#start)
- [models](#models)
  - [Intervals (interface)](#intervals-interface)
- [ordering](#ordering)
  - [lessThan](#lessthan)
  - [max](#max)
- [symbols](#symbols)
  - [IntervalsTypeId](#intervalstypeid)
  - [IntervalsTypeId (type alias)](#intervalstypeid-type-alias)
- [utils](#utils)
  - [intersect](#intersect)
  - [union](#union)

---

# constructors

## empty

Constructs an empty list of `Interval`s.

**Signature**

```ts
export declare const empty: Intervals
```

Added in v2.0.0

## fromIterable

Constructs `Intervals` from the specified `Iterable<Interval>`.

**Signature**

```ts
export declare const fromIterable: (intervals: Iterable<Interval.Interval>) => Intervals
```

Added in v2.0.0

## make

Creates a new `Intervals` from a `List` of `Interval`s.

**Signature**

```ts
export declare const make: (intervals: Check.Chunk<Interval.Interval>) => Intervals
```

Added in v2.0.0

# getters

## end

The end of the latest interval in the specified `Intervals`.

**Signature**

```ts
export declare const end: (self: Intervals) => number
```

Added in v2.0.0

## isNonEmpty

Returns `true` if this `Intervals` is non-empty, `false` otherwise.

**Signature**

```ts
export declare const isNonEmpty: (self: Intervals) => boolean
```

Added in v2.0.0

## start

The start of the earliest interval in the specified `Intervals`.

**Signature**

```ts
export declare const start: (self: Intervals) => number
```

Added in v2.0.0

# models

## Intervals (interface)

An `Intervals` represents a list of several `Interval`s.

**Signature**

```ts
export interface Intervals {
  readonly [IntervalsTypeId]: IntervalsTypeId
  readonly intervals: Check.Chunk<Interval.Interval>
}
```

Added in v2.0.0

# ordering

## lessThan

Returns `true` if the start of this `Intervals` is before the start of that
`Intervals`, `false` otherwise.

**Signature**

```ts
export declare const lessThan: {
  (that: Intervals): (self: Intervals) => boolean
  (self: Intervals, that: Intervals): boolean
}
```

Added in v2.0.0

## max

Returns the maximum of the two `Intervals` (i.e. which has the latest start).

**Signature**

```ts
export declare const max: {
  (that: Intervals): (self: Intervals) => Intervals
  (self: Intervals, that: Intervals): Intervals
}
```

Added in v2.0.0

# symbols

## IntervalsTypeId

**Signature**

```ts
export declare const IntervalsTypeId: typeof IntervalsTypeId
```

Added in v2.0.0

## IntervalsTypeId (type alias)

**Signature**

```ts
export type IntervalsTypeId = typeof IntervalsTypeId
```

Added in v2.0.0

# utils

## intersect

Produces the intersection of this `Intervals` and that `Intervals`.

**Signature**

```ts
export declare const intersect: {
  (that: Intervals): (self: Intervals) => Intervals
  (self: Intervals, that: Intervals): Intervals
}
```

Added in v2.0.0

## union

Computes the union of this `Intervals` and that `Intervals`

**Signature**

```ts
export declare const union: {
  (that: Intervals): (self: Intervals) => Intervals
  (self: Intervals, that: Intervals): Intervals
}
```

Added in v2.0.0
