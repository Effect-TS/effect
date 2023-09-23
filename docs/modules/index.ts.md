---
title: index.ts
nav_order: 47
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
  - [Channel](#channel)
  - [ChannelChildExecutorDecision](#channelchildexecutordecision)
  - [ChannelMergeDecision](#channelmergedecision)
  - [ChannelMergeState](#channelmergestate)
  - [ChannelMergeStrategy](#channelmergestrategy)
  - [ChannelSingleProducerAsyncInput](#channelsingleproducerasyncinput)
  - [ChannelUpstreamPullRequest](#channelupstreampullrequest)
  - [ChannelUpstreamPullStrategy](#channelupstreampullstrategy)
  - [Chunk](#chunk)
  - [Clock](#clock)
  - [Concurrency](#concurrency)
  - [Config](#config)
  - [ConfigError](#configerror)
  - [ConfigProvider](#configprovider)
  - [ConfigSecret](#configsecret)
  - [Console](#console)
  - [Context](#context)
  - [Data](#data)
  - [DefaultServices](#defaultservices)
  - [Deferred](#deferred)
  - [Differ](#differ)
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
  - [FiberStatus](#fiberstatus)
  - [Function](#function)
  - [GlobalValue](#globalvalue)
  - [GroupBy](#groupby)
  - [HKT](#hkt)
  - [Hash](#hash)
  - [HashMap](#hashmap)
  - [HashSet](#hashset)
  - [Hub](#hub)
  - [KeyedPool](#keyedpool)
  - [Layer](#layer)
  - [List](#list)
  - [LogLevel](#loglevel)
  - [LogSpan](#logspan)
  - [Logger](#logger)
  - [Match](#match)
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
  - [PCGRandom](#pcgrandom)
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
  - [RuntimeFlags](#runtimeflags)
  - [RuntimeFlagsPatch](#runtimeflagspatch)
  - [STM](#stm)
  - [Schedule](#schedule)
  - [ScheduleDecision](#scheduledecision)
  - [ScheduleInterval](#scheduleinterval)
  - [ScheduleIntervals](#scheduleintervals)
  - [Scheduler](#scheduler)
  - [Scope](#scope)
  - [ScopedCache](#scopedcache)
  - [ScopedRef](#scopedref)
  - [Sink](#sink)
  - [SortedMap](#sortedmap)
  - [SortedSet](#sortedset)
  - [Stream](#stream)
  - [StreamEmit](#streamemit)
  - [StreamHaltStrategy](#streamhaltstrategy)
  - [String](#string)
  - [Struct](#struct)
  - [SubscriptionRef](#subscriptionref)
  - [Supervisor](#supervisor)
  - [Symbol](#symbol)
  - [SynchronizedRef](#synchronizedref)
  - [TArray](#tarray)
  - [TDeferred](#tdeferred)
  - [THub](#thub)
  - [TMap](#tmap)
  - [TPriorityQueue](#tpriorityqueue)
  - [TQueue](#tqueue)
  - [TRandom](#trandom)
  - [TReentrantLock](#treentrantlock)
  - [TRef](#tref)
  - [TSemaphore](#tsemaphore)
  - [TSet](#tset)
  - [Take](#take)
  - [Tracer](#tracer)
  - [Tuple](#tuple)
  - [Types](#types)
  - [absurd](#absurd)
  - [flow](#flow)
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

- Module: `@effect/data/Bigint`
- Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html

## Boolean

**Signature**

```ts
export declare const Boolean: any
```

Added in v2.0.0

- Module: `@effect/data/Boolean`
- Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html

## Brand

**Signature**

```ts
export declare const Brand: any
```

Added in v2.0.0

- Module: `@effect/data/Brand`
- Docs: https://effect-ts.github.io/data/modules/Brand.ts.html

## Cache

**Signature**

```ts
export declare const Cache: any
```

Added in v2.0.0

- Module: `@effect/io/Cache`
- Docs: https://effect-ts.github.io/io/modules/Cache.ts.html

## Cause

**Signature**

```ts
export declare const Cause: any
```

Added in v2.0.0

- Module: `@effect/io/Cause`
- Docs: https://effect-ts.github.io/io/modules/Cause.ts.html

## Channel

**Signature**

```ts
export declare const Channel: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel`
- Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html

## ChannelChildExecutorDecision

**Signature**

```ts
export declare const ChannelChildExecutorDecision: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/ChildExecutorDecision`
- Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html

## ChannelMergeDecision

**Signature**

```ts
export declare const ChannelMergeDecision: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/MergeDecision`
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html

## ChannelMergeState

**Signature**

```ts
export declare const ChannelMergeState: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/MergeState`
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html

## ChannelMergeStrategy

**Signature**

```ts
export declare const ChannelMergeStrategy: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/MergeStrategy`
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html

## ChannelSingleProducerAsyncInput

**Signature**

```ts
export declare const ChannelSingleProducerAsyncInput: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/SingleProducerAsyncInput`
- Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html

## ChannelUpstreamPullRequest

**Signature**

```ts
export declare const ChannelUpstreamPullRequest: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/UpstreamPullRequest`
- Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html

## ChannelUpstreamPullStrategy

**Signature**

```ts
export declare const ChannelUpstreamPullStrategy: any
```

Added in v2.0.0

- Module: `@effect/stream/Channel/UpstreamPullStrategy`
- Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html

## Chunk

**Signature**

```ts
export declare const Chunk: any
```

Added in v2.0.0

- Module: `@effect/data/Chunk`
- Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html

## Clock

**Signature**

```ts
export declare const Clock: any
```

Added in v2.0.0

- Module: `@effect/io/Clock`
- Docs: https://effect-ts.github.io/io/modules/Clock.ts.html

## Concurrency

**Signature**

```ts
export declare const Concurrency: any
```

Added in v2.0.0

- Module: `@effect/io/Concurrency`
- Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html

## Config

**Signature**

```ts
export declare const Config: any
```

Added in v2.0.0

- Module: `@effect/io/Config`
- Docs: https://effect-ts.github.io/io/modules/Config.ts.html

## ConfigError

**Signature**

```ts
export declare const ConfigError: any
```

Added in v2.0.0

- Module: `@effect/io/ConfigError`
- Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html

## ConfigProvider

**Signature**

```ts
export declare const ConfigProvider: any
```

Added in v2.0.0

- Module: `@effect/io/ConfigProvider`
- Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html

## ConfigSecret

**Signature**

```ts
export declare const ConfigSecret: any
```

Added in v2.0.0

- Module: `@effect/io/ConfigSecret`
- Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html

## Console

**Signature**

```ts
export declare const Console: any
```

Added in v2.0.0

- Module: `@effect/data/Console`
- Docs: https://effect-ts.github.io/data/modules/Console.ts.html

## Context

**Signature**

```ts
export declare const Context: any
```

Added in v2.0.0

- Module: `@effect/data/Context`
- Docs: https://effect-ts.github.io/data/modules/Context.ts.html

## Data

**Signature**

```ts
export declare const Data: any
```

Added in v2.0.0

- Module: `@effect/data/Data`
- Docs: https://effect-ts.github.io/data/modules/Data.ts.html

## DefaultServices

**Signature**

```ts
export declare const DefaultServices: any
```

Added in v2.0.0

- Module: `@effect/io/DefaultServices`
- Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html

## Deferred

**Signature**

```ts
export declare const Deferred: any
```

Added in v2.0.0

- Module: `@effect/io/Deferred`
- Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html

## Differ

**Signature**

```ts
export declare const Differ: any
```

Added in v2.0.0

- Module: `@effect/data/Differ`
- Docs: https://effect-ts.github.io/data/modules/Differ.ts.html

## Duration

**Signature**

```ts
export declare const Duration: any
```

Added in v2.0.0

- Module: `@effect/data/Duration`
- Docs: https://effect-ts.github.io/data/modules/Duration.ts.html

## Effect

**Signature**

```ts
export declare const Effect: any
```

Added in v2.0.0

- Module: `@effect/io/Effect`
- Docs: https://effect-ts.github.io/io/modules/Effect.ts.html

## Either

**Signature**

```ts
export declare const Either: any
```

Added in v2.0.0

- Module: `@effect/data/Either`
- Docs: https://effect-ts.github.io/data/modules/Either.ts.html

## Equal

**Signature**

```ts
export declare const Equal: any
```

Added in v2.0.0

- Module: `@effect/data/Equal`
- Docs: https://effect-ts.github.io/data/modules/Equal.ts.html

## Equivalence

**Signature**

```ts
export declare const Equivalence: any
```

Added in v2.0.0

- Module: `@effect/data/Equivalence`
- Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html

## ExecutionStrategy

**Signature**

```ts
export declare const ExecutionStrategy: any
```

Added in v2.0.0

- Module: `@effect/io/ExecutionStrategy`
- Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html

## Exit

**Signature**

```ts
export declare const Exit: any
```

Added in v2.0.0

- Module: `@effect/io/Exit`
- Docs: https://effect-ts.github.io/io/modules/Exit.ts.html

## Fiber

**Signature**

```ts
export declare const Fiber: any
```

Added in v2.0.0

- Module: `@effect/io/Fiber`
- Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html

## FiberId

**Signature**

```ts
export declare const FiberId: any
```

Added in v2.0.0

- Module: `@effect/io/FiberId`
- Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html

## FiberRef

**Signature**

```ts
export declare const FiberRef: any
```

Added in v2.0.0

- Module: `@effect/io/FiberRef`
- Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html

## FiberRefs

**Signature**

```ts
export declare const FiberRefs: any
```

Added in v2.0.0

- Module: `@effect/io/FiberRefs`
- Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html

## FiberStatus

**Signature**

```ts
export declare const FiberStatus: any
```

Added in v2.0.0

- Module: `@effect/io/FiberStatus`
- Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html

## Function

**Signature**

```ts
export declare const Function: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html

## GlobalValue

**Signature**

```ts
export declare const GlobalValue: any
```

Added in v2.0.0

- Module: `@effect/data/GlobalValue`
- Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html

## GroupBy

**Signature**

```ts
export declare const GroupBy: any
```

Added in v2.0.0

- Module: `@effect/stream/GroupBy`
- Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html

## HKT

**Signature**

```ts
export declare const HKT: any
```

Added in v2.0.0

- Module: `@effect/data/HKT`
- Docs: https://fp-ts.github.io/core/modules/HKT.ts.html

## Hash

**Signature**

```ts
export declare const Hash: any
```

Added in v2.0.0

- Module: `@effect/data/Hash`
- Docs: https://effect-ts.github.io/data/modules/Hash.ts.html

## HashMap

**Signature**

```ts
export declare const HashMap: any
```

Added in v2.0.0

- Module: `@effect/data/HashMap`
- Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html

## HashSet

**Signature**

```ts
export declare const HashSet: any
```

Added in v2.0.0

- Module: `@effect/data/HashSet`
- Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html

## Hub

**Signature**

```ts
export declare const Hub: any
```

Added in v2.0.0

- Module: `@effect/io/Hub`
- Docs: https://effect-ts.github.io/io/modules/Hub.ts.html

## KeyedPool

**Signature**

```ts
export declare const KeyedPool: any
```

Added in v2.0.0

- Module: `@effect/io/KeyedPool`
- Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html

## Layer

**Signature**

```ts
export declare const Layer: any
```

Added in v2.0.0

- Module: `@effect/io/Layer`
- Docs: https://effect-ts.github.io/io/modules/Layer.ts.html

## List

**Signature**

```ts
export declare const List: any
```

Added in v2.0.0

- Module: `@effect/data/List`
- Docs: https://effect-ts.github.io/data/modules/List.ts.html

## LogLevel

**Signature**

```ts
export declare const LogLevel: any
```

Added in v2.0.0

- Module: `@effect/io/LogLevel`
- Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html

## LogSpan

**Signature**

```ts
export declare const LogSpan: any
```

Added in v2.0.0

- Module: `@effect/io/LoggerSpan`
- Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html

## Logger

**Signature**

```ts
export declare const Logger: any
```

Added in v2.0.0

- Module: `@effect/io/Logger`
- Docs: https://effect-ts.github.io/io/modules/Logger.ts.html

## Match

**Signature**

```ts
export declare const Match: any
```

Added in v2.0.0

- Module: `@effect/match`
- Docs: https://effect-ts.github.io/match/modules/index.ts.html

## Metric

**Signature**

```ts
export declare const Metric: any
```

Added in v2.0.0

- Module: `@effect/io/Metric`
- Docs: https://effect-ts.github.io/io/modules/Metric.ts.html

## MetricBoundaries

**Signature**

```ts
export declare const MetricBoundaries: any
```

Added in v2.0.0

- Module: `@effect/io/MetricBoundaries`
- Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html

## MetricHook

**Signature**

```ts
export declare const MetricHook: any
```

Added in v2.0.0

- Module: `@effect/io/MetricHook`
- Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html

## MetricKey

**Signature**

```ts
export declare const MetricKey: any
```

Added in v2.0.0

- Module: `@effect/io/MetricKey`
- Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html

## MetricKeyType

**Signature**

```ts
export declare const MetricKeyType: any
```

Added in v2.0.0

- Module: `@effect/io/MetricKeyType`
- Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html

## MetricLabel

**Signature**

```ts
export declare const MetricLabel: any
```

Added in v2.0.0

- Module: `@effect/io/MetricLabel`
- Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html

## MetricPair

**Signature**

```ts
export declare const MetricPair: any
```

Added in v2.0.0

- Module: `@effect/io/MetricPair`
- Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html

## MetricPolling

**Signature**

```ts
export declare const MetricPolling: any
```

Added in v2.0.0

- Module: `@effect/io/MetricPolling`
- Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html

## MetricRegistry

**Signature**

```ts
export declare const MetricRegistry: any
```

Added in v2.0.0

- Module: `@effect/io/MetricRegistry`
- Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html

## MetricState

**Signature**

```ts
export declare const MetricState: any
```

Added in v2.0.0

- Module: `@effect/io/MetricState`
- Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html

## MutableHashMap

**Signature**

```ts
export declare const MutableHashMap: any
```

Added in v2.0.0

- Module: `@effect/data/MutableHashMap`
- Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html

## MutableHashSet

**Signature**

```ts
export declare const MutableHashSet: any
```

Added in v2.0.0

- Module: `@effect/data/MutableHashSet`
- Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html

## MutableList

**Signature**

```ts
export declare const MutableList: any
```

Added in v2.0.0

- Module: `@effect/data/MutableList`
- Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html

## MutableQueue

**Signature**

```ts
export declare const MutableQueue: any
```

Added in v2.0.0

- Module: `@effect/data/MutableQueue`
- Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html

## MutableRef

**Signature**

```ts
export declare const MutableRef: any
```

Added in v2.0.0

- Module: `@effect/data/mutable/MutableRef`
- Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html

## Number

**Signature**

```ts
export declare const Number: any
```

Added in v2.0.0

- Module: `@effect/data/Number`
- Docs: https://effect-ts.github.io/data/modules/Number.ts.html

## Option

**Signature**

```ts
export declare const Option: any
```

Added in v2.0.0

- Module: `@effect/data/Option`
- Docs: https://effect-ts.github.io/data/modules/Option.ts.html

## Order

**Signature**

```ts
export declare const Order: any
```

Added in v2.0.0

- Module: `@effect/data/Order`
- Docs: https://effect-ts.github.io/data/modules/Order.ts.html

## Ordering

**Signature**

```ts
export declare const Ordering: any
```

Added in v2.0.0

- Module: `@effect/data/Ordering`
- Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html

## PCGRandom

**Signature**

```ts
export declare const PCGRandom: any
```

Added in v2.0.0

- Module: `@effect/data/PCGRandom`
- Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html

## Pipeable

**Signature**

```ts
export declare const Pipeable: any
```

Added in v2.0.0

- Module: `@effect/data/Pipeable`
- Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html

## Pool

**Signature**

```ts
export declare const Pool: any
```

Added in v2.0.0

- Module: `@effect/io/Pool`
- Docs: https://effect-ts.github.io/io/modules/Pool.ts.html

## Predicate

**Signature**

```ts
export declare const Predicate: any
```

Added in v2.0.0

- Module: `@effect/data/Predicate`
- Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html

## Queue

**Signature**

```ts
export declare const Queue: any
```

Added in v2.0.0

- Module: `@effect/io/Queue`
- Docs: https://effect-ts.github.io/io/modules/Queue.ts.html

## Random

**Signature**

```ts
export declare const Random: any
```

Added in v2.0.0

- Module: `@effect/io/Random`
- Docs: https://effect-ts.github.io/io/modules/Random.ts.html

## ReadonlyArray

**Signature**

```ts
export declare const ReadonlyArray: any
```

Added in v2.0.0

- Module: `@effect/data/ReadonlyArray`
- Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html

## ReadonlyRecord

**Signature**

```ts
export declare const ReadonlyRecord: any
```

Added in v2.0.0

- Module: `@effect/data/ReadonlyRecord`
- Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html

## RedBlackTree

**Signature**

```ts
export declare const RedBlackTree: any
```

Added in v2.0.0

- Module: `@effect/data/RedBlackTree`
- Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html

## Ref

**Signature**

```ts
export declare const Ref: any
```

Added in v2.0.0

- Module: `@effect/io/Ref`
- Docs: https://effect-ts.github.io/io/modules/Ref.ts.html

## Reloadable

**Signature**

```ts
export declare const Reloadable: any
```

Added in v2.0.0

- Module: `@effect/io/Reloadable`
- Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html

## Request

**Signature**

```ts
export declare const Request: any
```

Added in v2.0.0

- Module: `@effect/io/Request`
- Docs: https://effect-ts.github.io/io/modules/Request.ts.html

## RequestBlock

**Signature**

```ts
export declare const RequestBlock: any
```

Added in v2.0.0

- Module: `@effect/io/RequestBlock`
- Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html

## RequestResolver

**Signature**

```ts
export declare const RequestResolver: any
```

Added in v2.0.0

- Module: `@effect/io/RequestResolver`
- Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html

## Resource

**Signature**

```ts
export declare const Resource: any
```

Added in v2.0.0

- Module: `@effect/io/Resource`
- Docs: https://effect-ts.github.io/io/modules/Resource.ts.html

## Runtime

**Signature**

```ts
export declare const Runtime: any
```

Added in v2.0.0

- Module: `@effect/io/Runtime`
- Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html

## RuntimeFlags

**Signature**

```ts
export declare const RuntimeFlags: any
```

Added in v2.0.0

- Module: `@effect/io/RuntimeFlags`
- Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html

## RuntimeFlagsPatch

**Signature**

```ts
export declare const RuntimeFlagsPatch: any
```

Added in v2.0.0

- Module: `@effect/io/RuntimeFlagsPatch`
- Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html

## STM

**Signature**

```ts
export declare const STM: any
```

Added in v2.0.0

- Module: `@effect/stm/STM`
- Docs: https://effect-ts.github.io/stm/modules/STM.ts.html

## Schedule

**Signature**

```ts
export declare const Schedule: any
```

Added in v2.0.0

- Module: `@effect/io/Schedule`
- Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html

## ScheduleDecision

**Signature**

```ts
export declare const ScheduleDecision: any
```

Added in v2.0.0

- Module: `@effect/io/ScheduleDecision`
- Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html

## ScheduleInterval

**Signature**

```ts
export declare const ScheduleInterval: any
```

Added in v2.0.0

- Module: `@effect/io/ScheduleInterval`
- Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html

## ScheduleIntervals

**Signature**

```ts
export declare const ScheduleIntervals: any
```

Added in v2.0.0

- Module: `@effect/io/ScheduleIntervals`
- Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html

## Scheduler

**Signature**

```ts
export declare const Scheduler: any
```

Added in v2.0.0

- Module: `@effect/io/Scheduler`
- Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html

## Scope

**Signature**

```ts
export declare const Scope: any
```

Added in v2.0.0

- Module: `@effect/io/Scope`
- Docs: https://effect-ts.github.io/io/modules/Scope.ts.html

## ScopedCache

**Signature**

```ts
export declare const ScopedCache: any
```

Added in v2.0.0

- Module: `@effect/io/ScopedCache`
- Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html

## ScopedRef

**Signature**

```ts
export declare const ScopedRef: any
```

Added in v2.0.0

- Module: `@effect/io/ScopedRef`
- Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html

## Sink

**Signature**

```ts
export declare const Sink: any
```

Added in v2.0.0

- Module: `@effect/stream/Sink`
- Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html

## SortedMap

**Signature**

```ts
export declare const SortedMap: any
```

Added in v2.0.0

- Module: `@effect/data/SortedMap`
- Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html

## SortedSet

**Signature**

```ts
export declare const SortedSet: any
```

Added in v2.0.0

- Module: `@effect/data/SortedSet`
- Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html

## Stream

**Signature**

```ts
export declare const Stream: any
```

Added in v2.0.0

- Module: `@effect/stream/Stream`
- Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html

## StreamEmit

**Signature**

```ts
export declare const StreamEmit: any
```

Added in v2.0.0

- Module: `@effect/stream/Stream/Emit`
- Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html

## StreamHaltStrategy

**Signature**

```ts
export declare const StreamHaltStrategy: any
```

Added in v2.0.0

- Module: `@effect/stream/Stream/HaltStrategy`
- Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html

## String

**Signature**

```ts
export declare const String: any
```

Added in v2.0.0

- Module: `@effect/data/String`
- Docs: https://effect-ts.github.io/data/modules/String.ts.html

## Struct

**Signature**

```ts
export declare const Struct: any
```

Added in v2.0.0

- Module: `@effect/data/Struct`
- Docs: https://effect-ts.github.io/data/modules/Struct.ts.html

## SubscriptionRef

**Signature**

```ts
export declare const SubscriptionRef: any
```

Added in v2.0.0

- Module: `@effect/stream/SubscriptionRef`
- Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html

## Supervisor

**Signature**

```ts
export declare const Supervisor: any
```

Added in v2.0.0

- Module: `@effect/io/Supervisor`
- Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html

## Symbol

**Signature**

```ts
export declare const Symbol: any
```

Added in v2.0.0

- Module: `@effect/data/Symbol`
- Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html

## SynchronizedRef

**Signature**

```ts
export declare const SynchronizedRef: any
```

Added in v2.0.0

- Module: `@effect/io/SynchronizedRef`
- Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html

## TArray

**Signature**

```ts
export declare const TArray: any
```

Added in v2.0.0

- Module: `@effect/stm/TArray`
- Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html

## TDeferred

**Signature**

```ts
export declare const TDeferred: any
```

Added in v2.0.0

- Module: `@effect/stm/TDeferred`
- Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html

## THub

**Signature**

```ts
export declare const THub: any
```

Added in v2.0.0

- Module: `@effect/stm/THub`
- Docs: https://effect-ts.github.io/stm/modules/THub.ts.html

## TMap

**Signature**

```ts
export declare const TMap: any
```

Added in v2.0.0

- Module: `@effect/stm/TMap`
- Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html

## TPriorityQueue

**Signature**

```ts
export declare const TPriorityQueue: any
```

Added in v2.0.0

- Module: `@effect/stm/TPriorityQueue`
- Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html

## TQueue

**Signature**

```ts
export declare const TQueue: any
```

Added in v2.0.0

- Module: `@effect/stm/TQueue`
- Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html

## TRandom

**Signature**

```ts
export declare const TRandom: any
```

Added in v2.0.0

- Module: `@effect/stm/TRandom`
- Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html

## TReentrantLock

**Signature**

```ts
export declare const TReentrantLock: any
```

Added in v2.0.0

- Module: `@effect/stm/TReentrantLock`
- Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html

## TRef

**Signature**

```ts
export declare const TRef: any
```

Added in v2.0.0

- Module: `@effect/stm/TRef`
- Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html

## TSemaphore

**Signature**

```ts
export declare const TSemaphore: any
```

Added in v2.0.0

- Module: `@effect/stm/TSemaphore`
- Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html

## TSet

**Signature**

```ts
export declare const TSet: any
```

Added in v2.0.0

- Module: `@effect/stm/TSet`
- Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html

## Take

**Signature**

```ts
export declare const Take: any
```

Added in v2.0.0

- Module: `@effect/stream/Take`
- Docs: https://effect-ts.github.io/stream/modules/Take.ts.html

## Tracer

**Signature**

```ts
export declare const Tracer: any
```

Added in v2.0.0

- Module: `@effect/io/Tracer`
- Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html

## Tuple

**Signature**

```ts
export declare const Tuple: any
```

Added in v2.0.0

- Module: `@effect/data/Tuple`
- Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html

## Types

**Signature**

```ts
export declare const Types: any
```

Added in v2.0.0

- Module: `@effect/data/Types`
- Docs: https://effect-ts.github.io/data/modules/Types.ts.html

## absurd

**Signature**

```ts
export declare const absurd: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd

## flow

**Signature**

```ts
export declare const flow: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow

## hole

**Signature**

```ts
export declare const hole: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole

## identity

**Signature**

```ts
export declare const identity: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity

## pipe

**Signature**

```ts
export declare const pipe: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe

## unsafeCoerce

**Signature**

```ts
export declare const unsafeCoerce: any
```

Added in v2.0.0

- Module: `@effect/data/Function`
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#unsafecoerce
