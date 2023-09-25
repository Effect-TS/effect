---
title: index.ts
nav_order: 48
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
  - [FiberRefsPatch](#fiberrefspatch)
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

Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html

**Signature**

```ts
export declare const Bigint: any
```

Added in v2.0.0

## Boolean

Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html

**Signature**

```ts
export declare const Boolean: any
```

Added in v2.0.0

## Brand

Docs: https://effect-ts.github.io/data/modules/Brand.ts.html

**Signature**

```ts
export declare const Brand: any
```

Added in v2.0.0

## Cache

Docs: https://effect-ts.github.io/io/modules/Cache.ts.html

**Signature**

```ts
export declare const Cache: any
```

Added in v2.0.0

## Cause

Docs: https://effect-ts.github.io/io/modules/Cause.ts.html

**Signature**

```ts
export declare const Cause: any
```

Added in v2.0.0

## Channel

Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html

**Signature**

```ts
export declare const Channel: any
```

Added in v2.0.0

## ChannelChildExecutorDecision

Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html

**Signature**

```ts
export declare const ChannelChildExecutorDecision: any
```

Added in v2.0.0

## ChannelMergeDecision

Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html

**Signature**

```ts
export declare const ChannelMergeDecision: any
```

Added in v2.0.0

## ChannelMergeState

Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html

**Signature**

```ts
export declare const ChannelMergeState: any
```

Added in v2.0.0

## ChannelMergeStrategy

Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html

**Signature**

```ts
export declare const ChannelMergeStrategy: any
```

Added in v2.0.0

## ChannelSingleProducerAsyncInput

Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html

**Signature**

```ts
export declare const ChannelSingleProducerAsyncInput: any
```

Added in v2.0.0

## ChannelUpstreamPullRequest

Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html

**Signature**

```ts
export declare const ChannelUpstreamPullRequest: any
```

Added in v2.0.0

## ChannelUpstreamPullStrategy

Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html

**Signature**

```ts
export declare const ChannelUpstreamPullStrategy: any
```

Added in v2.0.0

## Chunk

Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html

**Signature**

```ts
export declare const Chunk: any
```

Added in v2.0.0

## Clock

Docs: https://effect-ts.github.io/io/modules/Clock.ts.html

**Signature**

```ts
export declare const Clock: any
```

Added in v2.0.0

## Concurrency

Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html

**Signature**

```ts
export declare const Concurrency: any
```

Added in v2.0.0

## Config

Docs: https://effect-ts.github.io/io/modules/Config.ts.html

**Signature**

```ts
export declare const Config: any
```

Added in v2.0.0

## ConfigError

Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html

**Signature**

```ts
export declare const ConfigError: any
```

Added in v2.0.0

## ConfigProvider

Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html

**Signature**

```ts
export declare const ConfigProvider: any
```

Added in v2.0.0

## ConfigSecret

Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html

**Signature**

```ts
export declare const ConfigSecret: any
```

Added in v2.0.0

## Console

Docs: https://effect-ts.github.io/data/modules/Console.ts.html

**Signature**

```ts
export declare const Console: any
```

Added in v2.0.0

## Context

Docs: https://effect-ts.github.io/data/modules/Context.ts.html

**Signature**

```ts
export declare const Context: any
```

Added in v2.0.0

## Data

Docs: https://effect-ts.github.io/data/modules/Data.ts.html

**Signature**

```ts
export declare const Data: any
```

Added in v2.0.0

## DefaultServices

Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html

**Signature**

```ts
export declare const DefaultServices: any
```

Added in v2.0.0

## Deferred

Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html

**Signature**

```ts
export declare const Deferred: any
```

Added in v2.0.0

## Differ

Docs: https://effect-ts.github.io/data/modules/Differ.ts.html

**Signature**

```ts
export declare const Differ: any
```

Added in v2.0.0

## Duration

Docs: https://effect-ts.github.io/data/modules/Duration.ts.html

**Signature**

```ts
export declare const Duration: any
```

Added in v2.0.0

## Effect

Docs: https://effect-ts.github.io/io/modules/Effect.ts.html

**Signature**

```ts
export declare const Effect: any
```

Added in v2.0.0

## Either

Docs: https://effect-ts.github.io/data/modules/Either.ts.html

**Signature**

```ts
export declare const Either: any
```

Added in v2.0.0

## Equal

Docs: https://effect-ts.github.io/data/modules/Equal.ts.html

**Signature**

```ts
export declare const Equal: any
```

Added in v2.0.0

## Equivalence

Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html

**Signature**

```ts
export declare const Equivalence: any
```

Added in v2.0.0

## ExecutionStrategy

Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html

**Signature**

```ts
export declare const ExecutionStrategy: any
```

Added in v2.0.0

## Exit

Docs: https://effect-ts.github.io/io/modules/Exit.ts.html

**Signature**

```ts
export declare const Exit: any
```

Added in v2.0.0

## Fiber

Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html

**Signature**

```ts
export declare const Fiber: any
```

Added in v2.0.0

## FiberId

Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html

**Signature**

```ts
export declare const FiberId: any
```

Added in v2.0.0

## FiberRef

Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html

**Signature**

```ts
export declare const FiberRef: any
```

Added in v2.0.0

## FiberRefs

Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html

**Signature**

```ts
export declare const FiberRefs: any
```

Added in v2.0.0

## FiberRefsPatch

Docs: https://effect-ts.github.io/io/modules/FiberRefsPatch.ts.html

**Signature**

```ts
export declare const FiberRefsPatch: any
```

Added in v2.0.0

## FiberStatus

Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html

**Signature**

```ts
export declare const FiberStatus: any
```

Added in v2.0.0

## Function

Docs: https://effect-ts.github.io/data/modules/Function.ts.html

**Signature**

```ts
export declare const Function: any
```

Added in v2.0.0

## GlobalValue

Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html

**Signature**

```ts
export declare const GlobalValue: any
```

Added in v2.0.0

## GroupBy

Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html

**Signature**

```ts
export declare const GroupBy: any
```

Added in v2.0.0

## HKT

Docs: https://fp-ts.github.io/core/modules/HKT.ts.html

**Signature**

```ts
export declare const HKT: any
```

Added in v2.0.0

## Hash

Docs: https://effect-ts.github.io/data/modules/Hash.ts.html

**Signature**

```ts
export declare const Hash: any
```

Added in v2.0.0

## HashMap

Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html

**Signature**

```ts
export declare const HashMap: any
```

Added in v2.0.0

## HashSet

Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html

**Signature**

```ts
export declare const HashSet: any
```

Added in v2.0.0

## Hub

Docs: https://effect-ts.github.io/io/modules/Hub.ts.html

**Signature**

```ts
export declare const Hub: any
```

Added in v2.0.0

## KeyedPool

Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html

**Signature**

```ts
export declare const KeyedPool: any
```

Added in v2.0.0

## Layer

Docs: https://effect-ts.github.io/io/modules/Layer.ts.html

**Signature**

```ts
export declare const Layer: any
```

Added in v2.0.0

## List

Docs: https://effect-ts.github.io/data/modules/List.ts.html

**Signature**

```ts
export declare const List: any
```

Added in v2.0.0

## LogLevel

Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html

**Signature**

```ts
export declare const LogLevel: any
```

Added in v2.0.0

## LogSpan

Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html

**Signature**

```ts
export declare const LogSpan: any
```

Added in v2.0.0

## Logger

Docs: https://effect-ts.github.io/io/modules/Logger.ts.html

**Signature**

```ts
export declare const Logger: any
```

Added in v2.0.0

## Match

Docs: https://effect-ts.github.io/match/modules/index.ts.html

**Signature**

```ts
export declare const Match: any
```

Added in v2.0.0

## Metric

Docs: https://effect-ts.github.io/io/modules/Metric.ts.html

**Signature**

```ts
export declare const Metric: any
```

Added in v2.0.0

## MetricBoundaries

Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html

**Signature**

```ts
export declare const MetricBoundaries: any
```

Added in v2.0.0

## MetricHook

Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html

**Signature**

```ts
export declare const MetricHook: any
```

Added in v2.0.0

## MetricKey

Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html

**Signature**

```ts
export declare const MetricKey: any
```

Added in v2.0.0

## MetricKeyType

Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html

**Signature**

```ts
export declare const MetricKeyType: any
```

Added in v2.0.0

## MetricLabel

Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html

**Signature**

```ts
export declare const MetricLabel: any
```

Added in v2.0.0

## MetricPair

Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html

**Signature**

```ts
export declare const MetricPair: any
```

Added in v2.0.0

## MetricPolling

Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html

**Signature**

```ts
export declare const MetricPolling: any
```

Added in v2.0.0

## MetricRegistry

Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html

**Signature**

```ts
export declare const MetricRegistry: any
```

Added in v2.0.0

## MetricState

Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html

**Signature**

```ts
export declare const MetricState: any
```

Added in v2.0.0

## MutableHashMap

Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html

**Signature**

```ts
export declare const MutableHashMap: any
```

Added in v2.0.0

## MutableHashSet

Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html

**Signature**

```ts
export declare const MutableHashSet: any
```

Added in v2.0.0

## MutableList

Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html

**Signature**

```ts
export declare const MutableList: any
```

Added in v2.0.0

## MutableQueue

Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html

**Signature**

```ts
export declare const MutableQueue: any
```

Added in v2.0.0

## MutableRef

Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html

**Signature**

```ts
export declare const MutableRef: any
```

Added in v2.0.0

## Number

Docs: https://effect-ts.github.io/data/modules/Number.ts.html

**Signature**

```ts
export declare const Number: any
```

Added in v2.0.0

## Option

Docs: https://effect-ts.github.io/data/modules/Option.ts.html

**Signature**

```ts
export declare const Option: any
```

Added in v2.0.0

## Order

Docs: https://effect-ts.github.io/data/modules/Order.ts.html

**Signature**

```ts
export declare const Order: any
```

Added in v2.0.0

## Ordering

Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html

**Signature**

```ts
export declare const Ordering: any
```

Added in v2.0.0

## PCGRandom

Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html

**Signature**

```ts
export declare const PCGRandom: any
```

Added in v2.0.0

## Pipeable

Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html

**Signature**

```ts
export declare const Pipeable: any
```

Added in v2.0.0

## Pool

Docs: https://effect-ts.github.io/io/modules/Pool.ts.html

**Signature**

```ts
export declare const Pool: any
```

Added in v2.0.0

## Predicate

Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html

**Signature**

```ts
export declare const Predicate: any
```

Added in v2.0.0

## Queue

Docs: https://effect-ts.github.io/io/modules/Queue.ts.html

**Signature**

```ts
export declare const Queue: any
```

Added in v2.0.0

## Random

Docs: https://effect-ts.github.io/io/modules/Random.ts.html

**Signature**

```ts
export declare const Random: any
```

Added in v2.0.0

## ReadonlyArray

Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html

**Signature**

```ts
export declare const ReadonlyArray: any
```

Added in v2.0.0

## ReadonlyRecord

Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html

**Signature**

```ts
export declare const ReadonlyRecord: any
```

Added in v2.0.0

## RedBlackTree

Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html

**Signature**

```ts
export declare const RedBlackTree: any
```

Added in v2.0.0

## Ref

Docs: https://effect-ts.github.io/io/modules/Ref.ts.html

**Signature**

```ts
export declare const Ref: any
```

Added in v2.0.0

## Reloadable

Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html

**Signature**

```ts
export declare const Reloadable: any
```

Added in v2.0.0

## Request

Docs: https://effect-ts.github.io/io/modules/Request.ts.html

**Signature**

```ts
export declare const Request: any
```

Added in v2.0.0

## RequestBlock

Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html

**Signature**

```ts
export declare const RequestBlock: any
```

Added in v2.0.0

## RequestResolver

Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html

**Signature**

```ts
export declare const RequestResolver: any
```

Added in v2.0.0

## Resource

Docs: https://effect-ts.github.io/io/modules/Resource.ts.html

**Signature**

```ts
export declare const Resource: any
```

Added in v2.0.0

## Runtime

Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html

**Signature**

```ts
export declare const Runtime: any
```

Added in v2.0.0

## RuntimeFlags

Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html

**Signature**

```ts
export declare const RuntimeFlags: any
```

Added in v2.0.0

## RuntimeFlagsPatch

Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html

**Signature**

```ts
export declare const RuntimeFlagsPatch: any
```

Added in v2.0.0

## STM

Docs: https://effect-ts.github.io/stm/modules/STM.ts.html

**Signature**

```ts
export declare const STM: any
```

Added in v2.0.0

## Schedule

Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html

**Signature**

```ts
export declare const Schedule: any
```

Added in v2.0.0

## ScheduleDecision

Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html

**Signature**

```ts
export declare const ScheduleDecision: any
```

Added in v2.0.0

## ScheduleInterval

Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html

**Signature**

```ts
export declare const ScheduleInterval: any
```

Added in v2.0.0

## ScheduleIntervals

Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html

**Signature**

```ts
export declare const ScheduleIntervals: any
```

Added in v2.0.0

## Scheduler

Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html

**Signature**

```ts
export declare const Scheduler: any
```

Added in v2.0.0

## Scope

Docs: https://effect-ts.github.io/io/modules/Scope.ts.html

**Signature**

```ts
export declare const Scope: any
```

Added in v2.0.0

## ScopedCache

Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html

**Signature**

```ts
export declare const ScopedCache: any
```

Added in v2.0.0

## ScopedRef

Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html

**Signature**

```ts
export declare const ScopedRef: any
```

Added in v2.0.0

## Sink

Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html

**Signature**

```ts
export declare const Sink: any
```

Added in v2.0.0

## SortedMap

Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html

**Signature**

```ts
export declare const SortedMap: any
```

Added in v2.0.0

## SortedSet

Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html

**Signature**

```ts
export declare const SortedSet: any
```

Added in v2.0.0

## Stream

Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html

**Signature**

```ts
export declare const Stream: any
```

Added in v2.0.0

## StreamEmit

Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html

**Signature**

```ts
export declare const StreamEmit: any
```

Added in v2.0.0

## StreamHaltStrategy

Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html

**Signature**

```ts
export declare const StreamHaltStrategy: any
```

Added in v2.0.0

## String

Docs: https://effect-ts.github.io/data/modules/String.ts.html

**Signature**

```ts
export declare const String: any
```

Added in v2.0.0

## Struct

Docs: https://effect-ts.github.io/data/modules/Struct.ts.html

**Signature**

```ts
export declare const Struct: any
```

Added in v2.0.0

## SubscriptionRef

Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html

**Signature**

```ts
export declare const SubscriptionRef: any
```

Added in v2.0.0

## Supervisor

Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html

**Signature**

```ts
export declare const Supervisor: any
```

Added in v2.0.0

## Symbol

Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html

**Signature**

```ts
export declare const Symbol: any
```

Added in v2.0.0

## SynchronizedRef

Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html

**Signature**

```ts
export declare const SynchronizedRef: any
```

Added in v2.0.0

## TArray

Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html

**Signature**

```ts
export declare const TArray: any
```

Added in v2.0.0

## TDeferred

Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html

**Signature**

```ts
export declare const TDeferred: any
```

Added in v2.0.0

## THub

Docs: https://effect-ts.github.io/stm/modules/THub.ts.html

**Signature**

```ts
export declare const THub: any
```

Added in v2.0.0

## TMap

Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html

**Signature**

```ts
export declare const TMap: any
```

Added in v2.0.0

## TPriorityQueue

Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html

**Signature**

```ts
export declare const TPriorityQueue: any
```

Added in v2.0.0

## TQueue

Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html

**Signature**

```ts
export declare const TQueue: any
```

Added in v2.0.0

## TRandom

Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html

**Signature**

```ts
export declare const TRandom: any
```

Added in v2.0.0

## TReentrantLock

Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html

**Signature**

```ts
export declare const TReentrantLock: any
```

Added in v2.0.0

## TRef

Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html

**Signature**

```ts
export declare const TRef: any
```

Added in v2.0.0

## TSemaphore

Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html

**Signature**

```ts
export declare const TSemaphore: any
```

Added in v2.0.0

## TSet

Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html

**Signature**

```ts
export declare const TSet: any
```

Added in v2.0.0

## Take

Docs: https://effect-ts.github.io/stream/modules/Take.ts.html

**Signature**

```ts
export declare const Take: any
```

Added in v2.0.0

## Tracer

Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html

**Signature**

```ts
export declare const Tracer: any
```

Added in v2.0.0

## Tuple

Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html

**Signature**

```ts
export declare const Tuple: any
```

Added in v2.0.0

## Types

Docs: https://effect-ts.github.io/data/modules/Types.ts.html

**Signature**

```ts
export declare const Types: any
```

Added in v2.0.0

## absurd

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd

**Signature**

```ts
export declare const absurd: any
```

Added in v2.0.0

## flow

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow

**Signature**

```ts
export declare const flow: any
```

Added in v2.0.0

## hole

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole

**Signature**

```ts
export declare const hole: any
```

Added in v2.0.0

## identity

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity

**Signature**

```ts
export declare const identity: any
```

Added in v2.0.0

## pipe

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe

**Signature**

```ts
export declare const pipe: any
```

Added in v2.0.0

## unsafeCoerce

Docs: https://effect-ts.github.io/data/modules/Function.ts.html#unsafecoerce

**Signature**

```ts
export declare const unsafeCoerce: any
```

Added in v2.0.0
