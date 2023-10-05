---
title: ScheduleDecision.ts
nav_order: 96
parent: Modules
---

## ScheduleDecision overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [continue](#continue)
  - [continueWith](#continuewith)
  - [done](#done)
- [models](#models)
  - [Continue (interface)](#continue-interface)
  - [Done (interface)](#done-interface)
  - [ScheduleDecision (type alias)](#scheduledecision-type-alias)
- [refinements](#refinements)
  - [isContinue](#iscontinue)
  - [isDone](#isdone)

---

# constructors

## continue

**Signature**

```ts
export declare const continue: (intervals: Intervals.Intervals) => ScheduleDecision
```

Added in v2.0.0

## continueWith

**Signature**

```ts
export declare const continueWith: (interval: Interval.Interval) => ScheduleDecision
```

Added in v2.0.0

## done

**Signature**

```ts
export declare const done: ScheduleDecision
```

Added in v2.0.0

# models

## Continue (interface)

**Signature**

```ts
export interface Continue {
  readonly _tag: 'Continue'
  readonly intervals: Intervals.Intervals
}
```

Added in v2.0.0

## Done (interface)

**Signature**

```ts
export interface Done {
  readonly _tag: 'Done'
}
```

Added in v2.0.0

## ScheduleDecision (type alias)

**Signature**

```ts
export type ScheduleDecision = Continue | Done
```

Added in v2.0.0

# refinements

## isContinue

**Signature**

```ts
export declare const isContinue: (self: ScheduleDecision) => self is Continue
```

Added in v2.0.0

## isDone

**Signature**

```ts
export declare const isDone: (self: ScheduleDecision) => self is Done
```

Added in v2.0.0
