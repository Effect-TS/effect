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

## Channel

**Signature**

```ts
export declare const Channel: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html
- Module: "@effect/stream/Channel"
```

## ChannelChildExecutorDecision

**Signature**

```ts
export declare const ChannelChildExecutorDecision: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html
- Module: "@effect/stream/Channel/ChildExecutorDecision"
```

## ChannelMergeDecision

**Signature**

```ts
export declare const ChannelMergeDecision: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html
- Module: "@effect/stream/Channel/MergeDecision"
```

## ChannelMergeState

**Signature**

```ts
export declare const ChannelMergeState: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html
- Module: "@effect/stream/Channel/MergeState"
```

## ChannelMergeStrategy

**Signature**

```ts
export declare const ChannelMergeStrategy: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html
- Module: "@effect/stream/Channel/MergeStrategy"
```

## ChannelSingleProducerAsyncInput

**Signature**

```ts
export declare const ChannelSingleProducerAsyncInput: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html
- Module: "@effect/stream/Channel/SingleProducerAsyncInput"
```

## ChannelUpstreamPullRequest

**Signature**

```ts
export declare const ChannelUpstreamPullRequest: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html
- Module: "@effect/stream/Channel/UpstreamPullRequest"
```

## ChannelUpstreamPullStrategy

**Signature**

```ts
export declare const ChannelUpstreamPullStrategy: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html
- Module: "@effect/stream/Channel/UpstreamPullStrategy"
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

## ConfigError

**Signature**

```ts
export declare const ConfigError: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html
- Module: "effect/ConfigError"
```

## ConfigProvider

**Signature**

```ts
export declare const ConfigProvider: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html
- Module: "effect/ConfigProvider"
```

## ConfigSecret

**Signature**

```ts
export declare const ConfigSecret: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html
- Module: "effect/ConfigSecret"
```

## Console

**Signature**

```ts
export declare const Console: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Console.ts.html
- Module: "effect/Console"
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
- Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html
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

## FiberStatus

**Signature**

```ts
export declare const FiberStatus: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html
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

## GlobalValue

**Signature**

```ts
export declare const GlobalValue: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html
- Module: "effect/GlobalValue"
```

## GroupBy

**Signature**

```ts
export declare const GroupBy: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html
- Module: "@effect/stream/GroupBy"
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

## LogLevel

**Signature**

```ts
export declare const LogLevel: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html
- Module: "effect/LogLevel"
```

## LogSpan

**Signature**

```ts
export declare const LogSpan: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html
- Module: "effect/LoggerSpan"
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

## Match

**Signature**

```ts
export declare const Match: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/match/modules/index.ts.html
- Module: "@effect/match"
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
- Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html
- Module: "effect/MetricBoundaries"
```

## MetricHook

**Signature**

```ts
export declare const MetricHook: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html
- Module: "effect/MetricHook"
```

## MetricKey

**Signature**

```ts
export declare const MetricKey: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html
- Module: "effect/MetricKey"
```

## MetricKeyType

**Signature**

```ts
export declare const MetricKeyType: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html
- Module: "effect/MetricKeyType"
```

## MetricLabel

**Signature**

```ts
export declare const MetricLabel: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html
- Module: "effect/MetricLabel"
```

## MetricPair

**Signature**

```ts
export declare const MetricPair: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html
- Module: "effect/MetricPair"
```

## MetricPolling

**Signature**

```ts
export declare const MetricPolling: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html
- Module: "effect/MetricPolling"
```

## MetricRegistry

**Signature**

```ts
export declare const MetricRegistry: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html
- Module: "effect/MetricRegistry"
```

## MetricState

**Signature**

```ts
export declare const MetricState: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html
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

## PCGRandom

**Signature**

```ts
export declare const PCGRandom: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html
- Module: "effect/PCGRandom"
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

## RuntimeFlags

**Signature**

```ts
export declare const RuntimeFlags: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html
- Module: "effect/RuntimeFlags"
```

## RuntimeFlagsPatch

**Signature**

```ts
export declare const RuntimeFlagsPatch: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html
- Module: "effect/RuntimeFlagsPatch"
```

## STM

**Signature**

```ts
export declare const STM: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/STM.ts.html
- Module: "@effect/stm/STM"
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
- Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html
- Module: "effect/ScheduleDecision"
```

## ScheduleInterval

**Signature**

```ts
export declare const ScheduleInterval: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html
- Module: "effect/ScheduleInterval"
```

## ScheduleIntervals

**Signature**

```ts
export declare const ScheduleIntervals: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html
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

## Sink

**Signature**

```ts
export declare const Sink: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html
- Module: "@effect/stream/Sink"
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

## Stream

**Signature**

```ts
export declare const Stream: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html
- Module: "@effect/stream/Stream"
```

## StreamEmit

**Signature**

```ts
export declare const StreamEmit: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html
- Module: "@effect/stream/Stream/Emit"
```

## StreamHaltStrategy

**Signature**

```ts
export declare const StreamHaltStrategy: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html
- Module: "@effect/stream/Stream/HaltStrategy"
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

## SubscriptionRef

**Signature**

```ts
export declare const SubscriptionRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html
- Module: "@effect/stream/SubscriptionRef"
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
- Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html
- Module: "effect/SynchronizedRef"
```

## TArray

**Signature**

```ts
export declare const TArray: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html
- Module: "@effect/stm/TArray"
```

## TDeferred

**Signature**

```ts
export declare const TDeferred: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html
- Module: "@effect/stm/TDeferred"
```

## TMap

**Signature**

```ts
export declare const TMap: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html
- Module: "@effect/stm/TMap"
```

## TPriorityQueue

**Signature**

```ts
export declare const TPriorityQueue: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html
- Module: "@effect/stm/TPriorityQueue"
```

## TQueue

**Signature**

```ts
export declare const TQueue: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html
- Module: "@effect/stm/TQueue"
```

## TRandom

**Signature**

```ts
export declare const TRandom: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html
- Module: "@effect/stm/TRandom"
```

## TReentrantLock

**Signature**

```ts
export declare const TReentrantLock: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html
- Module: "@effect/stm/TReentrantLock"
```

## TRef

**Signature**

```ts
export declare const TRef: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html
- Module: "@effect/stm/TRef"
```

## TSemaphore

**Signature**

```ts
export declare const TSemaphore: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html
- Module: "@effect/stm/TSemaphore"
```

## TSet

**Signature**

```ts
export declare const TSet: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html
- Module: "@effect/stm/TSet"
```

## Take

**Signature**

```ts
export declare const Take: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/stream/modules/Take.ts.html
- Module: "@effect/stream/Take"
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

## Types

**Signature**

```ts
export declare const Types: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Types.ts.html
- Module: "effect/Types"
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

## flow

**Signature**

```ts
export declare const flow: any
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow
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
