---
title: Scheduler.ts
nav_order: 98
parent: Modules
---

## Scheduler overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [ControlledScheduler (class)](#controlledscheduler-class)
    - [scheduleTask (method)](#scheduletask-method)
    - [shouldYield (method)](#shouldyield-method)
    - [step (method)](#step-method)
    - [tasks (property)](#tasks-property)
    - [deferred (property)](#deferred-property)
  - [MixedScheduler (class)](#mixedscheduler-class)
    - [starveInternal (method)](#starveinternal-method)
    - [starve (method)](#starve-method)
    - [shouldYield (method)](#shouldyield-method-1)
    - [scheduleTask (method)](#scheduletask-method-1)
    - [running (property)](#running-property)
    - [tasks (property)](#tasks-property-1)
  - [SyncScheduler (class)](#syncscheduler-class)
    - [scheduleTask (method)](#scheduletask-method-2)
    - [shouldYield (method)](#shouldyield-method-2)
    - [flush (method)](#flush-method)
    - [tasks (property)](#tasks-property-2)
    - [deferred (property)](#deferred-property-1)
  - [make](#make)
  - [makeBatched](#makebatched)
  - [makeMatrix](#makematrix)
  - [timer](#timer)
  - [timerBatched](#timerbatched)
- [models](#models)
  - [Scheduler (interface)](#scheduler-interface)
  - [Task (type alias)](#task-type-alias)
- [schedulers](#schedulers)
  - [defaultScheduler](#defaultscheduler)
- [utilities](#utilities)
  - [defaultShouldYield](#defaultshouldyield)
- [utils](#utils)
  - [PriorityBuckets (class)](#prioritybuckets-class)
    - [scheduleTask (method)](#scheduletask-method-3)
    - [buckets (property)](#buckets-property)

---

# constructors

## ControlledScheduler (class)

**Signature**

```ts
export declare class ControlledScheduler
```

Added in v2.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task, priority: number)
```

Added in v2.0.0

### shouldYield (method)

**Signature**

```ts
shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
```

Added in v2.0.0

### step (method)

**Signature**

```ts
step()
```

Added in v2.0.0

### tasks (property)

**Signature**

```ts
tasks: PriorityBuckets<Task>
```

Added in v2.0.0

### deferred (property)

**Signature**

```ts
deferred: boolean
```

Added in v2.0.0

## MixedScheduler (class)

**Signature**

```ts
export declare class MixedScheduler { constructor(
    /**
     * @since 2.0.0
     */
    readonly maxNextTickBeforeTimer: number
  ) }
```

Added in v2.0.0

### starveInternal (method)

**Signature**

```ts
private starveInternal(depth: number)
```

Added in v2.0.0

### starve (method)

**Signature**

```ts
private starve(depth = 0)
```

Added in v2.0.0

### shouldYield (method)

**Signature**

```ts
shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
```

Added in v2.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task, priority: number)
```

Added in v2.0.0

### running (property)

**Signature**

```ts
running: boolean
```

Added in v2.0.0

### tasks (property)

**Signature**

```ts
tasks: PriorityBuckets<Task>
```

Added in v2.0.0

## SyncScheduler (class)

**Signature**

```ts
export declare class SyncScheduler
```

Added in v2.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task, priority: number)
```

Added in v2.0.0

### shouldYield (method)

**Signature**

```ts
shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
```

Added in v2.0.0

### flush (method)

**Signature**

```ts
flush()
```

Added in v2.0.0

### tasks (property)

**Signature**

```ts
tasks: PriorityBuckets<Task>
```

Added in v2.0.0

### deferred (property)

**Signature**

```ts
deferred: boolean
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (
  scheduleTask: Scheduler["scheduleTask"],
  shouldYield?: Scheduler["shouldYield"]
) => Scheduler
```

Added in v2.0.0

## makeBatched

**Signature**

```ts
export declare const makeBatched: (
  callback: (runBatch: () => void) => void,
  shouldYield?: Scheduler["shouldYield"]
) => Scheduler
```

Added in v2.0.0

## makeMatrix

**Signature**

```ts
export declare const makeMatrix: (...record: Array<[number, Scheduler]>) => Scheduler
```

Added in v2.0.0

## timer

**Signature**

```ts
export declare const timer: (ms: number, shouldYield?: Scheduler["shouldYield"]) => Scheduler
```

Added in v2.0.0

## timerBatched

**Signature**

```ts
export declare const timerBatched: (ms: number, shouldYield?: Scheduler["shouldYield"]) => Scheduler
```

Added in v2.0.0

# models

## Scheduler (interface)

**Signature**

```ts
export interface Scheduler {
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
  scheduleTask(task: Task, priority: number): void
}
```

Added in v2.0.0

## Task (type alias)

**Signature**

```ts
export type Task = () => void
```

Added in v2.0.0

# schedulers

## defaultScheduler

**Signature**

```ts
export declare const defaultScheduler: Scheduler
```

Added in v2.0.0

# utilities

## defaultShouldYield

**Signature**

```ts
export declare const defaultShouldYield: (fiber: RuntimeFiber<unknown, unknown>) => number | false
```

Added in v2.0.0

# utils

## PriorityBuckets (class)

**Signature**

```ts
export declare class PriorityBuckets<T>
```

Added in v2.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: T, priority: number)
```

Added in v2.0.0

### buckets (property)

**Signature**

```ts
buckets: [number, T[]][]
```

Added in v2.0.0
