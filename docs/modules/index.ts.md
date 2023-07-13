---
title: index.ts
nav_order: 41
parent: Modules
---

## index overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Bigint](#bigint)
  - [Boolean](#boolean)
  - [Brand](#brand)
  - [Cache](#cache)
  - [Cause](#cause)
  - [Chunk](#chunk)
  - [Clock](#clock)
  - [Concurrency](#concurrency)
  - [Config](#config)
  - [Context](#context)
  - [Data](#data)
  - [DefaultServices](#defaultservices)
  - [Deferred](#deferred)
  - [DeterministicRandom](#deterministicrandom)
  - [Differ](#differ)
  - [DifferChunkPatch](#differchunkpatch)
  - [DifferContextPatch](#differcontextpatch)
  - [DifferHashMapPatch](#differhashmappatch)
  - [DifferHashSetPatch](#differhashsetpatch)
  - [DifferOrPatch](#differorpatch)
  - [Duration](#duration)
  - [Effect](#effect)
  - [Either](#either)
  - [Equal](#equal)
  - [Equivalence](#equivalence)
  - [ExecutionStrategy](#executionstrategy)
  - [Exit](#exit)
  - [Fiber](#fiber)
  - [FiberId](#fiberid)
  - [FiberRef](#fiberref)
  - [FiberRefs](#fiberrefs)
  - [FiberRuntimeFlags](#fiberruntimeflags)
  - [FiberRuntimeFlagsPatch](#fiberruntimeflagspatch)
  - [FiberStatus](#fiberstatus)
  - [Function](#function)
  - [HKT](#hkt)
  - [Hash](#hash)
  - [HashMap](#hashmap)
  - [HashSet](#hashset)
  - [Hub](#hub)
  - [KeyedPool](#keyedpool)
  - [Layer](#layer)
  - [List](#list)
  - [Logger](#logger)
  - [LoggerLevel](#loggerlevel)
  - [LoggerSpan](#loggerspan)
  - [Metric](#metric)
  - [MetricBoundaries](#metricboundaries)
  - [MetricHook](#metrichook)
  - [MetricKey](#metrickey)
  - [MetricKeyType](#metrickeytype)
  - [MetricLabel](#metriclabel)
  - [MetricPair](#metricpair)
  - [MetricPolling](#metricpolling)
  - [MetricRegistry](#metricregistry)
  - [MetricState](#metricstate)
  - [MutableHashMap](#mutablehashmap)
  - [MutableHashSet](#mutablehashset)
  - [MutableList](#mutablelist)
  - [MutableQueue](#mutablequeue)
  - [MutableRef](#mutableref)
  - [Number](#number)
  - [Option](#option)
  - [Order](#order)
  - [Ordering](#ordering)
  - [Pipeable](#pipeable)
  - [Pool](#pool)
  - [Predicate](#predicate)
  - [Queue](#queue)
  - [Random](#random)
  - [ReadonlyArray](#readonlyarray)
  - [ReadonlyRecord](#readonlyrecord)
  - [RedBlackTree](#redblacktree)
  - [Ref](#ref)
  - [Reloadable](#reloadable)
  - [Request](#request)
  - [RequestBlock](#requestblock)
  - [RequestResolver](#requestresolver)
  - [Resource](#resource)
  - [Runtime](#runtime)
  - [Schedule](#schedule)
  - [ScheduleDecision](#scheduledecision)
  - [ScheduleInterval](#scheduleinterval)
  - [ScheduleIntervals](#scheduleintervals)
  - [Scheduler](#scheduler)
  - [Scope](#scope)
  - [ScopedCache](#scopedcache)
  - [ScopedRef](#scopedref)
  - [SortedMap](#sortedmap)
  - [SortedSet](#sortedset)
  - [String](#string)
  - [Struct](#struct)
  - [Supervisor](#supervisor)
  - [Symbol](#symbol)
  - [SynchronizedRef](#synchronizedref)
  - [Tracer](#tracer)
  - [Tuple](#tuple)
  - [absurd](#absurd)
  - [hole](#hole)
  - [identity](#identity)
  - [pipe](#pipe)
  - [unsafeCoerce](#unsafecoerce)

---

# utils

## Bigint

**Signature**

```ts
export declare const Bigint: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html
- Module: "effect/Bigint"
```

## Boolean

**Signature**

```ts
export declare const Boolean: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html
- Module: "effect/Boolean"
```

## Brand

**Signature**

```ts
export declare const Brand: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Brand.ts.html
- Module: "effect/Brand"
```

## Cache

**Signature**

```ts
export declare const Cache: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Cache.ts.html
- Module: "effect/Cache"
```

## Cause

**Signature**

```ts
export declare const Cause: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
- Module: "effect/Cause"
```

## Chunk

**Signature**

```ts
export declare const Chunk: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html
- Module: "effect/Chunk"
```

## Clock

**Signature**

```ts
export declare const Clock: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
- Module: "effect/Clock"
```

## Concurrency

**Signature**

```ts
export declare const Concurrency: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html
- Module: "effect/Concurrency"
```

## Config

**Signature**

```ts
export declare const Config: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Config.ts.html
- Module: "effect/Config"
```

## Context

**Signature**

```ts
export declare const Context: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Context.ts.html
- Module: "effect/Context"
```

## Data

**Signature**

```ts
export declare const Data: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Data.ts.html
- Module: "effect/Data"
```

## DefaultServices

**Signature**

```ts
export declare const DefaultServices: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
- Module: "effect/DefaultServices"
```

## Deferred

**Signature**

```ts
export declare const Deferred: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
- Module: "effect/Deferred"
```

## DeterministicRandom

**Signature**

```ts
export declare const DeterministicRandom: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Random.ts.html
- Module: "effect/Random"
```

## Differ

**Signature**

```ts
export declare const Differ: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ.ts.html
- Module: "effect/Differ"
```

## DifferChunkPatch

**Signature**

```ts
export declare const DifferChunkPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ/ChunkPatch.ts.html
- Module: "effect/DifferChunkPatch"
```

## DifferContextPatch

**Signature**

```ts
export declare const DifferContextPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ/ContextPatch.ts.html
- Module: "effect/DifferContextPatch"
```

## DifferHashMapPatch

**Signature**

```ts
export declare const DifferHashMapPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ/HashMapPatch.ts.html
- Module: "effect/DifferHashMapPatch"
```

## DifferHashSetPatch

**Signature**

```ts
export declare const DifferHashSetPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ/HashSetPatch.ts.html
- Module: "effect/DifferHashSetPatch"
```

## DifferOrPatch

**Signature**

```ts
export declare const DifferOrPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Differ/OrPatch.ts.html
- Module: "effect/DifferOrPatch"
```

## Duration

**Signature**

```ts
export declare const Duration: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Duration.ts.html
- Module: "effect/Duration"
```

## Effect

**Signature**

```ts
export declare const Effect: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
- Module: "effect/Effect"
```

## Either

**Signature**

```ts
export declare const Either: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Either.ts.html
- Module: "effect/Either"
```

## Equal

**Signature**

```ts
export declare const Equal: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Equal.ts.html
- Module: "effect/Equal"
```

## Equivalence

**Signature**

```ts
export declare const Equivalence: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html
- Module: "effect/Equivalence"
```

## ExecutionStrategy

**Signature**

```ts
export declare const ExecutionStrategy: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
- Module: "effect/ExecutionStrategy"
```

## Exit

**Signature**

```ts
export declare const Exit: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
- Module: "effect/Exit"
```

## Fiber

**Signature**

```ts
export declare const Fiber: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
- Module: "effect/Fiber"
```

## FiberId

**Signature**

```ts
export declare const FiberId: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber/Id.ts.html
- Module: "effect/FiberId"
```

## FiberRef

**Signature**

```ts
export declare const FiberRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
- Module: "effect/FiberRef"
```

## FiberRefs

**Signature**

```ts
export declare const FiberRefs: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
- Module: "effect/FiberRefs"
```

## FiberRuntimeFlags

**Signature**

```ts
export declare const FiberRuntimeFlags: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber/Runtime/Flags.ts.html
- Module: "effect/FiberRuntimeFlags"
```

## FiberRuntimeFlagsPatch

**Signature**

```ts
export declare const FiberRuntimeFlagsPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber/Runtime/Flags/Patch.ts.html
- Module: "effect/FiberRuntimeFlagsPatch"
```

## FiberStatus

**Signature**

```ts
export declare const FiberStatus: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber/Status.ts.html
- Module: "effect/FiberStatus"
```

## Function

**Signature**

```ts
export declare const Function: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html
- Module: "effect/Function"
```

## HKT

**Signature**

```ts
export declare const HKT: any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
- Module: "effect/HKT"
```

## Hash

**Signature**

```ts
export declare const Hash: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Hash.ts.html
- Module: "effect/Hash"
```

## HashMap

**Signature**

```ts
export declare const HashMap: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html
- Module: "effect/HashMap"
```

## HashSet

**Signature**

```ts
export declare const HashSet: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html
- Module: "effect/HashSet"
```

## Hub

**Signature**

```ts
export declare const Hub: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
- Module: "effect/Hub"
```

## KeyedPool

**Signature**

```ts
export declare const KeyedPool: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html
- Module: "effect/KeyedPool"
```

## Layer

**Signature**

```ts
export declare const Layer: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
- Module: "effect/Layer"
```

## List

**Signature**

```ts
export declare const List: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/List.ts.html
- Module: "effect/List"
```

## Logger

**Signature**

```ts
export declare const Logger: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
- Module: "effect/Logger"
```

## LoggerLevel

**Signature**

```ts
export declare const LoggerLevel: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Logger/Level.ts.html
- Module: "effect/LoggerLevel"
```

## LoggerSpan

**Signature**

```ts
export declare const LoggerSpan: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Logger/Span.ts.html
- Module: "effect/LoggerSpan"
```

## Metric

**Signature**

```ts
export declare const Metric: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
- Module: "effect/Metric"
```

## MetricBoundaries

**Signature**

```ts
export declare const MetricBoundaries: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Boundaries.ts.html
- Module: "effect/MetricBoundaries"
```

## MetricHook

**Signature**

```ts
export declare const MetricHook: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Hook.ts.html
- Module: "effect/MetricHook"
```

## MetricKey

**Signature**

```ts
export declare const MetricKey: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Key.ts.html
- Module: "effect/MetricKey"
```

## MetricKeyType

**Signature**

```ts
export declare const MetricKeyType: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/KeyType.ts.html
- Module: "effect/MetricKeyType"
```

## MetricLabel

**Signature**

```ts
export declare const MetricLabel: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Label.ts.html
- Module: "effect/MetricLabel"
```

## MetricPair

**Signature**

```ts
export declare const MetricPair: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Pair.ts.html
- Module: "effect/MetricPair"
```

## MetricPolling

**Signature**

```ts
export declare const MetricPolling: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/PollingPolling.ts.html
- Module: "effect/MetricPolling"
```

## MetricRegistry

**Signature**

```ts
export declare const MetricRegistry: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/Registry.ts.html
- Module: "effect/MetricRegistry"
```

## MetricState

**Signature**

```ts
export declare const MetricState: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric/State.ts.html
- Module: "effect/MetricState"
```

## MutableHashMap

**Signature**

```ts
export declare const MutableHashMap: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html
- Module: "effect/MutableHashMap"
```

## MutableHashSet

**Signature**

```ts
export declare const MutableHashSet: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html
- Module: "effect/MutableHashSet"
```

## MutableList

**Signature**

```ts
export declare const MutableList: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html
- Module: "effect/MutableList"
```

## MutableQueue

**Signature**

```ts
export declare const MutableQueue: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html
- Module: "effect/MutableQueue"
```

## MutableRef

**Signature**

```ts
export declare const MutableRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html
- Module: "effect/mutable/MutableRef"
```

## Number

**Signature**

```ts
export declare const Number: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Number.ts.html
- Module: "effect/Number"
```

## Option

**Signature**

```ts
export declare const Option: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Option.ts.html
- Module: "effect/Option"
```

## Order

**Signature**

```ts
export declare const Order: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Order.ts.html
- Module: "effect/Order"
```

## Ordering

**Signature**

```ts
export declare const Ordering: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html
- Module: "effect/Ordering"
```

## Pipeable

**Signature**

```ts
export declare const Pipeable: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html
- Module: "effect/Pipeable"
```

## Pool

**Signature**

```ts
export declare const Pool: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Pool.ts.html
- Module: "effect/Pool"
```

## Predicate

**Signature**

```ts
export declare const Predicate: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html
- Module: "effect/Predicate"
```

## Queue

**Signature**

```ts
export declare const Queue: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
- Module: "effect/Queue"
```

## Random

**Signature**

```ts
export declare const Random: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Random.ts.html
- Module: "effect/Random"
```

## ReadonlyArray

**Signature**

```ts
export declare const ReadonlyArray: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html
- Module: "effect/ReadonlyArray"
```

## ReadonlyRecord

**Signature**

```ts
export declare const ReadonlyRecord: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html
- Module: "effect/ReadonlyRecord"
```

## RedBlackTree

**Signature**

```ts
export declare const RedBlackTree: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html
- Module: "effect/RedBlackTree"
```

## Ref

**Signature**

```ts
export declare const Ref: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
- Module: "effect/Ref"
```

## Reloadable

**Signature**

```ts
export declare const Reloadable: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
- Module: "effect/Reloadable"
```

## Request

**Signature**

```ts
export declare const Request: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Request.ts.html
- Module: "effect/Request"
```

## RequestBlock

**Signature**

```ts
export declare const RequestBlock: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html
- Module: "effect/RequestBlock"
```

## RequestResolver

**Signature**

```ts
export declare const RequestResolver: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html
- Module: "effect/RequestResolver"
```

## Resource

**Signature**

```ts
export declare const Resource: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Resource.ts.html
- Module: "effect/Resource"
```

## Runtime

**Signature**

```ts
export declare const Runtime: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
- Module: "effect/Runtime"
```

## Schedule

**Signature**

```ts
export declare const Schedule: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
- Module: "effect/Schedule"
```

## ScheduleDecision

**Signature**

```ts
export declare const ScheduleDecision: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Schedule/Decision.ts.html
- Module: "effect/ScheduleDecision"
```

## ScheduleInterval

**Signature**

```ts
export declare const ScheduleInterval: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Schedule/Interval.ts.html
- Module: "effect/ScheduleInterval"
```

## ScheduleIntervals

**Signature**

```ts
export declare const ScheduleIntervals: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Schedule/Intervals.ts.html
- Module: "effect/ScheduleIntervals"
```

## Scheduler

**Signature**

```ts
export declare const Scheduler: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html
- Module: "effect/Scheduler"
```

## Scope

**Signature**

```ts
export declare const Scope: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
- Module: "effect/Scope"
```

## ScopedCache

**Signature**

```ts
export declare const ScopedCache: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html
- Module: "effect/ScopedCache"
```

## ScopedRef

**Signature**

```ts
export declare const ScopedRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html
- Module: "effect/ScopedRef"
```

## SortedMap

**Signature**

```ts
export declare const SortedMap: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html
- Module: "effect/SortedMap"
```

## SortedSet

**Signature**

```ts
export declare const SortedSet: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html
- Module: "effect/SortedSet"
```

## String

**Signature**

```ts
export declare const String: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/String.ts.html
- Module: "effect/String"
```

## Struct

**Signature**

```ts
export declare const Struct: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Struct.ts.html
- Module: "effect/Struct"
```

## Supervisor

**Signature**

```ts
export declare const Supervisor: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
- Module: "effect/Supervisor"
```

## Symbol

**Signature**

```ts
export declare const Symbol: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html
- Module: "effect/Symbol"
```

## SynchronizedRef

**Signature**

```ts
export declare const SynchronizedRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Ref/Synchronized.ts.html
- Module: "effect/SynchronizedRef"
```

## Tracer

**Signature**

```ts
export declare const Tracer: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
- Module: "effect/Tracer"
```

## Tuple

**Signature**

```ts
export declare const Tuple: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html
- Module: "effect/Tuple"
```

## absurd

**Signature**

```ts
export declare const absurd: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd
- Module: "effect/Function"
```

## hole

**Signature**

```ts
export declare const hole: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole
- Module: "effect/Function"
```

## identity

**Signature**

```ts
export declare const identity: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity
- Module: "effect/Function"
```

## pipe

**Signature**

```ts
export declare const pipe: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe
- Module: "effect/Function"
```

## unsafeCoerce

**Signature**

```ts
export declare const unsafeCoerce: any
```

Added in v2.0.0
