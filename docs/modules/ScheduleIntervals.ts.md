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
  - [ScheduleIntervals (interface)](#intervals-interface)
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
export declare const empty: ScheduleIntervals
```

Added in v2.0.0

## fromIterable

Constructs `ScheduleIntervals` from the specified `Iterable<Interval>`.

**Signature**

```ts
export declare const fromIterable: (intervals: Iterable<Interval>) => ScheduleIntervals
```

Added in v2.0.0

## make

Creates a new `ScheduleIntervals` from a `List` of `Interval`s.

**Signature**

```ts
export declare const make: (intervals: Check.Chunk<Interval>) => ScheduleIntervals
```

Added in v2.0.0

# getters

## end

The end of the latest interval in the specified `ScheduleIntervals`.

**Signature**

```ts
export declare const end: (self: ScheduleIntervals) => number
```

Added in v2.0.0

## isNonEmpty

Returns `true` if this `ScheduleIntervals` is non-empty, `false` otherwise.

**Signature**

```ts
export declare const isNonEmpty: (self: ScheduleIntervals) => boolean
```

Added in v2.0.0

## start

The start of the earliest interval in the specified `ScheduleIntervals`.

**Signature**

```ts
export declare const start: (self: ScheduleIntervals) => number
```

Added in v2.0.0

# models

## ScheduleIntervals (interface)

An `ScheduleIntervals` represents a list of several `Interval`s.

**Signature**

```ts
export interface ScheduleIntervals {
  readonly [IntervalsTypeId]: IntervalsTypeId
  readonly intervals: Check.Chunk<Interval>
}
```

Added in v2.0.0

# ordering

## lessThan

Returns `true` if the start of this `ScheduleIntervals` is before the start of that
`ScheduleIntervals`, `false` otherwise.

**Signature**

```ts
export declare const lessThan: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => boolean
  (self: ScheduleIntervals, that: ScheduleIntervals): boolean
}
```

Added in v2.0.0

## max

Returns the maximum of the two `ScheduleIntervals` (i.e. which has the latest start).

**Signature**

```ts
export declare const max: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
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

Produces the intersection of this `ScheduleIntervals` and that `ScheduleIntervals`.

**Signature**

```ts
export declare const intersect: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
}
```

Added in v2.0.0

## union

Computes the union of this `ScheduleIntervals` and that `ScheduleIntervals`

**Signature**

```ts
export declare const union: {
  (that: ScheduleIntervals): (self: ScheduleIntervals) => ScheduleIntervals
  (self: ScheduleIntervals, that: ScheduleIntervals): ScheduleIntervals
}
```

Added in v2.0.0
