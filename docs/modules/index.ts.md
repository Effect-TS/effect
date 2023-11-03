---
title: index.ts
nav_order: 44
parent: Modules
---

## index overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [exports](#exports)
  - [From "./BigDecimal.js"](#from-bigdecimaljs)
  - [From "./BigInt.js"](#from-bigintjs)
  - [From "./Boolean.js"](#from-booleanjs)
  - [From "./Brand.js"](#from-brandjs)
  - [From "./Cache.js"](#from-cachejs)
  - [From "./Cause.js"](#from-causejs)
  - [From "./Channel.js"](#from-channeljs)
  - [From "./ChildExecutorDecision.js"](#from-childexecutordecisionjs)
  - [From "./Chunk.js"](#from-chunkjs)
  - [From "./Clock.js"](#from-clockjs)
  - [From "./Config.js"](#from-configjs)
  - [From "./ConfigError.js"](#from-configerrorjs)
  - [From "./ConfigProvider.js"](#from-configproviderjs)
  - [From "./ConfigProviderPathPatch.js"](#from-configproviderpathpatchjs)
  - [From "./ConfigSecret.js"](#from-configsecretjs)
  - [From "./Console.js"](#from-consolejs)
  - [From "./Context.js"](#from-contextjs)
  - [From "./Data.js"](#from-datajs)
  - [From "./DefaultServices.js"](#from-defaultservicesjs)
  - [From "./Deferred.js"](#from-deferredjs)
  - [From "./Differ.js"](#from-differjs)
  - [From "./Duration.js"](#from-durationjs)
  - [From "./Effect.js"](#from-effectjs)
  - [From "./Effectable.js"](#from-effectablejs)
  - [From "./Either.js"](#from-eitherjs)
  - [From "./Encoding.js"](#from-encodingjs)
  - [From "./Equal.js"](#from-equaljs)
  - [From "./Equivalence.js"](#from-equivalencejs)
  - [From "./ExecutionStrategy.js"](#from-executionstrategyjs)
  - [From "./Exit.js"](#from-exitjs)
  - [From "./Fiber.js"](#from-fiberjs)
  - [From "./FiberId.js"](#from-fiberidjs)
  - [From "./FiberRef.js"](#from-fiberrefjs)
  - [From "./FiberRefs.js"](#from-fiberrefsjs)
  - [From "./FiberRefsPatch.js"](#from-fiberrefspatchjs)
  - [From "./FiberStatus.js"](#from-fiberstatusjs)
  - [From "./Function.js"](#from-functionjs)
  - [From "./GlobalValue.js"](#from-globalvaluejs)
  - [From "./GroupBy.js"](#from-groupbyjs)
  - [From "./HKT.js"](#from-hktjs)
  - [From "./Hash.js"](#from-hashjs)
  - [From "./HashMap.js"](#from-hashmapjs)
  - [From "./HashSet.js"](#from-hashsetjs)
  - [From "./Inspectable.js"](#from-inspectablejs)
  - [From "./KeyedPool.js"](#from-keyedpooljs)
  - [From "./Layer.js"](#from-layerjs)
  - [From "./List.js"](#from-listjs)
  - [From "./LogLevel.js"](#from-logleveljs)
  - [From "./LogSpan.js"](#from-logspanjs)
  - [From "./Logger.js"](#from-loggerjs)
  - [From "./Match.js"](#from-matchjs)
  - [From "./MergeDecision.js"](#from-mergedecisionjs)
  - [From "./MergeState.js"](#from-mergestatejs)
  - [From "./MergeStrategy.js"](#from-mergestrategyjs)
  - [From "./Metric.js"](#from-metricjs)
  - [From "./MetricBoundaries.js"](#from-metricboundariesjs)
  - [From "./MetricHook.js"](#from-metrichookjs)
  - [From "./MetricKey.js"](#from-metrickeyjs)
  - [From "./MetricKeyType.js"](#from-metrickeytypejs)
  - [From "./MetricLabel.js"](#from-metriclabeljs)
  - [From "./MetricPair.js"](#from-metricpairjs)
  - [From "./MetricPolling.js"](#from-metricpollingjs)
  - [From "./MetricRegistry.js"](#from-metricregistryjs)
  - [From "./MetricState.js"](#from-metricstatejs)
  - [From "./MutableHashMap.js"](#from-mutablehashmapjs)
  - [From "./MutableHashSet.js"](#from-mutablehashsetjs)
  - [From "./MutableList.js"](#from-mutablelistjs)
  - [From "./MutableQueue.js"](#from-mutablequeuejs)
  - [From "./MutableRef.js"](#from-mutablerefjs)
  - [From "./NonEmptyIterable.js"](#from-nonemptyiterablejs)
  - [From "./Number.js"](#from-numberjs)
  - [From "./Option.js"](#from-optionjs)
  - [From "./Order.js"](#from-orderjs)
  - [From "./Ordering.js"](#from-orderingjs)
  - [From "./Pipeable.js"](#from-pipeablejs)
  - [From "./Pool.js"](#from-pooljs)
  - [From "./Predicate.js"](#from-predicatejs)
  - [From "./PubSub.js"](#from-pubsubjs)
  - [From "./Queue.js"](#from-queuejs)
  - [From "./Random.js"](#from-randomjs)
  - [From "./ReadonlyArray.js"](#from-readonlyarrayjs)
  - [From "./ReadonlyRecord.js"](#from-readonlyrecordjs)
  - [From "./RedBlackTree.js"](#from-redblacktreejs)
  - [From "./Ref.js"](#from-refjs)
  - [From "./Reloadable.js"](#from-reloadablejs)
  - [From "./Request.js"](#from-requestjs)
  - [From "./RequestBlock.js"](#from-requestblockjs)
  - [From "./RequestResolver.js"](#from-requestresolverjs)
  - [From "./Resource.js"](#from-resourcejs)
  - [From "./Runtime.js"](#from-runtimejs)
  - [From "./RuntimeFlags.js"](#from-runtimeflagsjs)
  - [From "./RuntimeFlagsPatch.js"](#from-runtimeflagspatchjs)
  - [From "./STM.js"](#from-stmjs)
  - [From "./Schedule.js"](#from-schedulejs)
  - [From "./ScheduleDecision.js"](#from-scheduledecisionjs)
  - [From "./ScheduleInterval.js"](#from-scheduleintervaljs)
  - [From "./ScheduleIntervals.js"](#from-scheduleintervalsjs)
  - [From "./Scheduler.js"](#from-schedulerjs)
  - [From "./Scope.js"](#from-scopejs)
  - [From "./ScopedCache.js"](#from-scopedcachejs)
  - [From "./ScopedRef.js"](#from-scopedrefjs)
  - [From "./SingleProducerAsyncInput.js"](#from-singleproducerasyncinputjs)
  - [From "./Sink.js"](#from-sinkjs)
  - [From "./SortedMap.js"](#from-sortedmapjs)
  - [From "./SortedSet.js"](#from-sortedsetjs)
  - [From "./Stream.js"](#from-streamjs)
  - [From "./StreamEmit.js"](#from-streamemitjs)
  - [From "./StreamHaltStrategy.js"](#from-streamhaltstrategyjs)
  - [From "./Streamable.js"](#from-streamablejs)
  - [From "./String.js"](#from-stringjs)
  - [From "./Struct.js"](#from-structjs)
  - [From "./SubscriptionRef.js"](#from-subscriptionrefjs)
  - [From "./Supervisor.js"](#from-supervisorjs)
  - [From "./Symbol.js"](#from-symboljs)
  - [From "./SynchronizedRef.js"](#from-synchronizedrefjs)
  - [From "./TArray.js"](#from-tarrayjs)
  - [From "./TDeferred.js"](#from-tdeferredjs)
  - [From "./TMap.js"](#from-tmapjs)
  - [From "./TPriorityQueue.js"](#from-tpriorityqueuejs)
  - [From "./TPubSub.js"](#from-tpubsubjs)
  - [From "./TQueue.js"](#from-tqueuejs)
  - [From "./TRandom.js"](#from-trandomjs)
  - [From "./TReentrantLock.js"](#from-treentrantlockjs)
  - [From "./TRef.js"](#from-trefjs)
  - [From "./TSemaphore.js"](#from-tsemaphorejs)
  - [From "./TSet.js"](#from-tsetjs)
  - [From "./Take.js"](#from-takejs)
  - [From "./TestAnnotation.js"](#from-testannotationjs)
  - [From "./TestAnnotationMap.js"](#from-testannotationmapjs)
  - [From "./TestAnnotations.js"](#from-testannotationsjs)
  - [From "./TestClock.js"](#from-testclockjs)
  - [From "./TestConfig.js"](#from-testconfigjs)
  - [From "./TestContext.js"](#from-testcontextjs)
  - [From "./TestLive.js"](#from-testlivejs)
  - [From "./TestServices.js"](#from-testservicesjs)
  - [From "./TestSized.js"](#from-testsizedjs)
  - [From "./Tracer.js"](#from-tracerjs)
  - [From "./Tuple.js"](#from-tuplejs)
  - [From "./Types.js"](#from-typesjs)
  - [From "./Unify.js"](#from-unifyjs)
  - [From "./UpstreamPullRequest.js"](#from-upstreampullrequestjs)
  - [From "./UpstreamPullStrategy.js"](#from-upstreampullstrategyjs)
  - [From "./Utils.js"](#from-utilsjs)
- [utils](#utils)
  - [absurd](#absurd)
  - [flow](#flow)
  - [hole](#hole)
  - [identity](#identity)
  - [pipe](#pipe)
  - [unsafeCoerce](#unsafecoerce)

---

# exports

## From "./BigDecimal.js"

This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.

A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
(such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.

Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
decimal point. Therefore, the precision _is not_ actually arbitrary, but limited to 2<sup>63</sup> decimal places.

It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
may be unexpected.

**Signature**

```ts
export * as BigDecimal from "./BigDecimal.js"
```

Added in v2.0.0

## From "./BigInt.js"

This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence` and `Order`.

**Signature**

```ts
export * as BigInt from "./BigInt.js"
```

Added in v2.0.0

## From "./Boolean.js"

This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
It includes functions for basic boolean operations, as well as type class instances for
`Equivalence` and `Order`.

**Signature**

```ts
export * as Boolean from "./Boolean.js"
```

Added in v2.0.0

## From "./Brand.js"

This module provides types and utility functions to create and work with branded types,
which are TypeScript types with an added type tag to prevent accidental usage of a value in the wrong context.

The `refined` and `nominal` functions are both used to create branded types in TypeScript.
The main difference between them is that `refined` allows for validation of the data, while `nominal` does not.

The `nominal` function is used to create a new branded type that has the same underlying type as the input, but with a different name.
This is useful when you want to distinguish between two values of the same type that have different meanings.
The `nominal` function does not perform any validation of the input data.

On the other hand, the `refined` function is used to create a new branded type that has the same underlying type as the input,
but with a different name, and it also allows for validation of the input data.
The `refined` function takes a predicate that is used to validate the input data.
If the input data fails the validation, a `BrandErrors` is returned, which provides information about the specific validation failure.

**Signature**

```ts
export * as Brand from "./Brand.js"
```

Added in v2.0.0

## From "./Cache.js"

Re-exports all named exports from the "./Cache.js" module as `Cache`.

**Signature**

```ts
export * as Cache from "./Cache.js"
```

Added in v2.0.0

## From "./Cause.js"

The `Effect<R, E, A>` type is polymorphic in values of type `E` and we can
work with any error type that we want. However, there is a lot of information
that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
somewhere to store things like unexpected errors or defects, stack and
execution traces, causes of fiber interruptions, and so forth.

Effect-TS is very strict about preserving the full information related to a
failure. It captures all type of errors into the `Cause` data type. `Effect`
uses the `Cause<E>` data type to store the full story of failure. So its
error model is lossless. It doesn't throw information related to the failure
result. So we can figure out exactly what happened during the operation of
our effects.

It is important to note that `Cause` is an underlying data type representing
errors occuring within an `Effect` workflow. Thus, we don't usually deal with
`Cause`s directly. Even though it is not a data type that we deal with very
often, the `Cause` of a failing `Effect` workflow can be accessed at any
time, which gives us total access to all parallel and sequential errors in
occurring within our codebase.

**Signature**

```ts
export * as Cause from "./Cause.js"
```

Added in v2.0.0

## From "./Channel.js"

Re-exports all named exports from the "./Channel.js" module as `Channel`.

**Signature**

```ts
export * as Channel from "./Channel.js"
```

Added in v2.0.0

## From "./ChildExecutorDecision.js"

Re-exports all named exports from the "./ChildExecutorDecision.js" module as `ChildExecutorDecision`.

**Signature**

```ts
export * as ChildExecutorDecision from "./ChildExecutorDecision.js"
```

Added in v2.0.0

## From "./Chunk.js"

Re-exports all named exports from the "./Chunk.js" module as `Chunk`.

**Signature**

```ts
export * as Chunk from "./Chunk.js"
```

Added in v2.0.0

## From "./Clock.js"

Re-exports all named exports from the "./Clock.js" module as `Clock`.

**Signature**

```ts
export * as Clock from "./Clock.js"
```

Added in v2.0.0

## From "./Config.js"

Re-exports all named exports from the "./Config.js" module as `Config`.

**Signature**

```ts
export * as Config from "./Config.js"
```

Added in v2.0.0

## From "./ConfigError.js"

Re-exports all named exports from the "./ConfigError.js" module as `ConfigError`.

**Signature**

```ts
export * as ConfigError from "./ConfigError.js"
```

Added in v2.0.0

## From "./ConfigProvider.js"

Re-exports all named exports from the "./ConfigProvider.js" module as `ConfigProvider`.

**Signature**

```ts
export * as ConfigProvider from "./ConfigProvider.js"
```

Added in v2.0.0

## From "./ConfigProviderPathPatch.js"

Re-exports all named exports from the "./ConfigProviderPathPatch.js" module as `ConfigProviderPathPatch`.

**Signature**

```ts
export * as ConfigProviderPathPatch from "./ConfigProviderPathPatch.js"
```

Added in v2.0.0

## From "./ConfigSecret.js"

Re-exports all named exports from the "./ConfigSecret.js" module as `ConfigSecret`.

**Signature**

```ts
export * as ConfigSecret from "./ConfigSecret.js"
```

Added in v2.0.0

## From "./Console.js"

Re-exports all named exports from the "./Console.js" module as `Console`.

**Signature**

```ts
export * as Console from "./Console.js"
```

Added in v2.0.0

## From "./Context.js"

This module provides a data structure called `Context` that can be used for dependency injection in effectful
programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
of related services that can be passed around as a single unit. This module provides functions to create, modify, and
query the contents of a `Context`, as well as a number of utility types for working with tags and services.

**Signature**

```ts
export * as Context from "./Context.js"
```

Added in v2.0.0

## From "./Data.js"

Re-exports all named exports from the "./Data.js" module as `Data`.

**Signature**

```ts
export * as Data from "./Data.js"
```

Added in v2.0.0

## From "./DefaultServices.js"

Re-exports all named exports from the "./DefaultServices.js" module as `DefaultServices`.

**Signature**

```ts
export * as DefaultServices from "./DefaultServices.js"
```

Added in v2.0.0

## From "./Deferred.js"

Re-exports all named exports from the "./Deferred.js" module as `Deferred`.

**Signature**

```ts
export * as Deferred from "./Deferred.js"
```

Added in v2.0.0

## From "./Differ.js"

Re-exports all named exports from the "./Differ.js" module as `Differ`.

**Signature**

```ts
export * as Differ from "./Differ.js"
```

Added in v2.0.0

## From "./Duration.js"

Re-exports all named exports from the "./Duration.js" module as `Duration`.

**Signature**

```ts
export * as Duration from "./Duration.js"
```

Added in v2.0.0

## From "./Effect.js"

Re-exports all named exports from the "./Effect.js" module as `Effect`.

**Signature**

```ts
export * as Effect from "./Effect.js"
```

Added in v2.0.0

## From "./Effectable.js"

Re-exports all named exports from the "./Effectable.js" module as `Effectable`.

**Signature**

```ts
export * as Effectable from "./Effectable.js"
```

Added in v2.0.0

## From "./Either.js"

Re-exports all named exports from the "./Either.js" module as `Either`.

**Signature**

```ts
export * as Either from "./Either.js"
```

Added in v2.0.0

## From "./Encoding.js"

This module provides encoding & decoding functionality for:

- base64 (RFC4648)
- base64 (URL)
- hex

**Signature**

```ts
export * as Encoding from "./Encoding.js"
```

Added in v2.0.0

## From "./Equal.js"

Re-exports all named exports from the "./Equal.js" module as `Equal`.

**Signature**

```ts
export * as Equal from "./Equal.js"
```

Added in v2.0.0

## From "./Equivalence.js"

This module provides an implementation of the `Equivalence` type class, which defines a binary relation
that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
These properties are also known in mathematics as an "equivalence relation".

**Signature**

```ts
export * as Equivalence from "./Equivalence.js"
```

Added in v2.0.0

## From "./ExecutionStrategy.js"

Re-exports all named exports from the "./ExecutionStrategy.js" module as `ExecutionStrategy`.

**Signature**

```ts
export * as ExecutionStrategy from "./ExecutionStrategy.js"
```

Added in v2.0.0

## From "./Exit.js"

Re-exports all named exports from the "./Exit.js" module as `Exit`.

**Signature**

```ts
export * as Exit from "./Exit.js"
```

Added in v2.0.0

## From "./Fiber.js"

Re-exports all named exports from the "./Fiber.js" module as `Fiber`.

**Signature**

```ts
export * as Fiber from "./Fiber.js"
```

Added in v2.0.0

## From "./FiberId.js"

Re-exports all named exports from the "./FiberId.js" module as `FiberId`.

**Signature**

```ts
export * as FiberId from "./FiberId.js"
```

Added in v2.0.0

## From "./FiberRef.js"

Re-exports all named exports from the "./FiberRef.js" module as `FiberRef`.

**Signature**

```ts
export * as FiberRef from "./FiberRef.js"
```

Added in v2.0.0

## From "./FiberRefs.js"

Re-exports all named exports from the "./FiberRefs.js" module as `FiberRefs`.

**Signature**

```ts
export * as FiberRefs from "./FiberRefs.js"
```

Added in v2.0.0

## From "./FiberRefsPatch.js"

Re-exports all named exports from the "./FiberRefsPatch.js" module as `FiberRefsPatch`.

**Signature**

```ts
export * as FiberRefsPatch from "./FiberRefsPatch.js"
```

Added in v2.0.0

## From "./FiberStatus.js"

Re-exports all named exports from the "./FiberStatus.js" module as `FiberStatus`.

**Signature**

```ts
export * as FiberStatus from "./FiberStatus.js"
```

Added in v2.0.0

## From "./Function.js"

Re-exports all named exports from the "./Function.js" module as `Function`.

**Signature**

```ts
export * as Function from "./Function.js"
```

Added in v2.0.0

## From "./GlobalValue.js"

Re-exports all named exports from the "./GlobalValue.js" module as `GlobalValue`.

**Signature**

```ts
export * as GlobalValue from "./GlobalValue.js"
```

Added in v2.0.0

## From "./GroupBy.js"

Re-exports all named exports from the "./GroupBy.js" module as `GroupBy`.

**Signature**

```ts
export * as GroupBy from "./GroupBy.js"
```

Added in v2.0.0

## From "./HKT.js"

Re-exports all named exports from the "./HKT.js" module as `HKT`.

**Signature**

```ts
export * as HKT from "./HKT.js"
```

Added in v2.0.0

## From "./Hash.js"

Re-exports all named exports from the "./Hash.js" module as `Hash`.

**Signature**

```ts
export * as Hash from "./Hash.js"
```

Added in v2.0.0

## From "./HashMap.js"

Re-exports all named exports from the "./HashMap.js" module as `HashMap`.

**Signature**

```ts
export * as HashMap from "./HashMap.js"
```

Added in v2.0.0

## From "./HashSet.js"

Re-exports all named exports from the "./HashSet.js" module as `HashSet`.

**Signature**

```ts
export * as HashSet from "./HashSet.js"
```

Added in v2.0.0

## From "./Inspectable.js"

Re-exports all named exports from the "./Inspectable.js" module as `Inspectable`.

**Signature**

```ts
export * as Inspectable from "./Inspectable.js"
```

Added in v2.0.0

## From "./KeyedPool.js"

Re-exports all named exports from the "./KeyedPool.js" module as `KeyedPool`.

**Signature**

```ts
export * as KeyedPool from "./KeyedPool.js"
```

Added in v2.0.0

## From "./Layer.js"

A `Layer<RIn, E, ROut>` describes how to build one or more services in your
application. Services can be injected into effects via
`Effect.provideService`. Effects can require services via `Effect.service`.

Layer can be thought of as recipes for producing bundles of services, given
their dependencies (other services).

Construction of services can be effectful and utilize resources that must be
acquired and safely released when the services are done being utilized.

By default layers are shared, meaning that if the same layer is used twice
the layer will only be allocated a single time.

Because of their excellent composition properties, layers are the idiomatic
way in Effect-TS to create services that depend on other services.

**Signature**

```ts
export * as Layer from "./Layer.js"
```

Added in v2.0.0

## From "./List.js"

A data type for immutable linked lists representing ordered collections of elements of type `A`.

This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.

**Performance**

- Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
- Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.

**Signature**

```ts
export * as List from "./List.js"
```

Added in v2.0.0

## From "./LogLevel.js"

Re-exports all named exports from the "./LogLevel.js" module as `LogLevel`.

**Signature**

```ts
export * as LogLevel from "./LogLevel.js"
```

Added in v2.0.0

## From "./LogSpan.js"

Re-exports all named exports from the "./LogSpan.js" module as `LogSpan`.

**Signature**

```ts
export * as LogSpan from "./LogSpan.js"
```

Added in v2.0.0

## From "./Logger.js"

Re-exports all named exports from the "./Logger.js" module as `Logger`.

**Signature**

```ts
export * as Logger from "./Logger.js"
```

Added in v2.0.0

## From "./Match.js"

Re-exports all named exports from the "./Match.js" module as `Match`.

**Signature**

```ts
export * as Match from "./Match.js"
```

Added in v1.0.0

## From "./MergeDecision.js"

Re-exports all named exports from the "./MergeDecision.js" module as `MergeDecision`.

**Signature**

```ts
export * as MergeDecision from "./MergeDecision.js"
```

Added in v2.0.0

## From "./MergeState.js"

Re-exports all named exports from the "./MergeState.js" module as `MergeState`.

**Signature**

```ts
export * as MergeState from "./MergeState.js"
```

Added in v2.0.0

## From "./MergeStrategy.js"

Re-exports all named exports from the "./MergeStrategy.js" module as `MergeStrategy`.

**Signature**

```ts
export * as MergeStrategy from "./MergeStrategy.js"
```

Added in v2.0.0

## From "./Metric.js"

Re-exports all named exports from the "./Metric.js" module as `Metric`.

**Signature**

```ts
export * as Metric from "./Metric.js"
```

Added in v2.0.0

## From "./MetricBoundaries.js"

Re-exports all named exports from the "./MetricBoundaries.js" module as `MetricBoundaries`.

**Signature**

```ts
export * as MetricBoundaries from "./MetricBoundaries.js"
```

Added in v2.0.0

## From "./MetricHook.js"

Re-exports all named exports from the "./MetricHook.js" module as `MetricHook`.

**Signature**

```ts
export * as MetricHook from "./MetricHook.js"
```

Added in v2.0.0

## From "./MetricKey.js"

Re-exports all named exports from the "./MetricKey.js" module as `MetricKey`.

**Signature**

```ts
export * as MetricKey from "./MetricKey.js"
```

Added in v2.0.0

## From "./MetricKeyType.js"

Re-exports all named exports from the "./MetricKeyType.js" module as `MetricKeyType`.

**Signature**

```ts
export * as MetricKeyType from "./MetricKeyType.js"
```

Added in v2.0.0

## From "./MetricLabel.js"

Re-exports all named exports from the "./MetricLabel.js" module as `MetricLabel`.

**Signature**

```ts
export * as MetricLabel from "./MetricLabel.js"
```

Added in v2.0.0

## From "./MetricPair.js"

Re-exports all named exports from the "./MetricPair.js" module as `MetricPair`.

**Signature**

```ts
export * as MetricPair from "./MetricPair.js"
```

Added in v2.0.0

## From "./MetricPolling.js"

Re-exports all named exports from the "./MetricPolling.js" module as `MetricPolling`.

**Signature**

```ts
export * as MetricPolling from "./MetricPolling.js"
```

Added in v2.0.0

## From "./MetricRegistry.js"

Re-exports all named exports from the "./MetricRegistry.js" module as `MetricRegistry`.

**Signature**

```ts
export * as MetricRegistry from "./MetricRegistry.js"
```

Added in v2.0.0

## From "./MetricState.js"

Re-exports all named exports from the "./MetricState.js" module as `MetricState`.

**Signature**

```ts
export * as MetricState from "./MetricState.js"
```

Added in v2.0.0

## From "./MutableHashMap.js"

Re-exports all named exports from the "./MutableHashMap.js" module as `MutableHashMap`.

**Signature**

```ts
export * as MutableHashMap from "./MutableHashMap.js"
```

Added in v2.0.0

## From "./MutableHashSet.js"

Re-exports all named exports from the "./MutableHashSet.js" module as `MutableHashSet`.

**Signature**

```ts
export * as MutableHashSet from "./MutableHashSet.js"
```

Added in v2.0.0

## From "./MutableList.js"

Re-exports all named exports from the "./MutableList.js" module as `MutableList`.

**Signature**

```ts
export * as MutableList from "./MutableList.js"
```

Added in v2.0.0

## From "./MutableQueue.js"

Re-exports all named exports from the "./MutableQueue.js" module as `MutableQueue`.

**Signature**

```ts
export * as MutableQueue from "./MutableQueue.js"
```

Added in v2.0.0

## From "./MutableRef.js"

Re-exports all named exports from the "./MutableRef.js" module as `MutableRef`.

**Signature**

```ts
export * as MutableRef from "./MutableRef.js"
```

Added in v2.0.0

## From "./NonEmptyIterable.js"

Re-exports all named exports from the "./NonEmptyIterable.js" module as `NonEmptyIterable`.

**Signature**

```ts
export * as NonEmptyIterable from "./NonEmptyIterable.js"
```

Added in v2.0.0

## From "./Number.js"

This module provides utility functions and type class instances for working with the `number` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence` and `Order`.

**Signature**

```ts
export * as Number from "./Number.js"
```

Added in v2.0.0

## From "./Option.js"

Re-exports all named exports from the "./Option.js" module as `Option`.

**Signature**

```ts
export * as Option from "./Option.js"
```

Added in v2.0.0

## From "./Order.js"

Re-exports all named exports from the "./Order.js" module as `Order`.

**Signature**

```ts
export * as Order from "./Order.js"
```

Added in v2.0.0

## From "./Ordering.js"

Re-exports all named exports from the "./Ordering.js" module as `Ordering`.

**Signature**

```ts
export * as Ordering from "./Ordering.js"
```

Added in v2.0.0

## From "./Pipeable.js"

Re-exports all named exports from the "./Pipeable.js" module as `Pipeable`.

**Signature**

```ts
export * as Pipeable from "./Pipeable.js"
```

Added in v2.0.0

## From "./Pool.js"

Re-exports all named exports from the "./Pool.js" module as `Pool`.

**Signature**

```ts
export * as Pool from "./Pool.js"
```

Added in v2.0.0

## From "./Predicate.js"

Re-exports all named exports from the "./Predicate.js" module as `Predicate`.

**Signature**

```ts
export * as Predicate from "./Predicate.js"
```

Added in v2.0.0

## From "./PubSub.js"

Re-exports all named exports from the "./PubSub.js" module as `PubSub`.

**Signature**

```ts
export * as PubSub from "./PubSub.js"
```

Added in v2.0.0

## From "./Queue.js"

Re-exports all named exports from the "./Queue.js" module as `Queue`.

**Signature**

```ts
export * as Queue from "./Queue.js"
```

Added in v2.0.0

## From "./Random.js"

Re-exports all named exports from the "./Random.js" module as `Random`.

**Signature**

```ts
export * as Random from "./Random.js"
```

Added in v2.0.0

## From "./ReadonlyArray.js"

This module provides utility functions for working with arrays in TypeScript.

**Signature**

```ts
export * as ReadonlyArray from "./ReadonlyArray.js"
```

Added in v2.0.0

## From "./ReadonlyRecord.js"

This module provides utility functions for working with records in TypeScript.

**Signature**

```ts
export * as ReadonlyRecord from "./ReadonlyRecord.js"
```

Added in v2.0.0

## From "./RedBlackTree.js"

Re-exports all named exports from the "./RedBlackTree.js" module as `RedBlackTree`.

**Signature**

```ts
export * as RedBlackTree from "./RedBlackTree.js"
```

Added in v2.0.0

## From "./Ref.js"

Re-exports all named exports from the "./Ref.js" module as `Ref`.

**Signature**

```ts
export * as Ref from "./Ref.js"
```

Added in v2.0.0

## From "./Reloadable.js"

Re-exports all named exports from the "./Reloadable.js" module as `Reloadable`.

**Signature**

```ts
export * as Reloadable from "./Reloadable.js"
```

Added in v2.0.0

## From "./Request.js"

Re-exports all named exports from the "./Request.js" module as `Request`.

**Signature**

```ts
export * as Request from "./Request.js"
```

Added in v2.0.0

## From "./RequestBlock.js"

Re-exports all named exports from the "./RequestBlock.js" module as `RequestBlock`.

**Signature**

```ts
export * as RequestBlock from "./RequestBlock.js"
```

Added in v2.0.0

## From "./RequestResolver.js"

Re-exports all named exports from the "./RequestResolver.js" module as `RequestResolver`.

**Signature**

```ts
export * as RequestResolver from "./RequestResolver.js"
```

Added in v2.0.0

## From "./Resource.js"

Re-exports all named exports from the "./Resource.js" module as `Resource`.

**Signature**

```ts
export * as Resource from "./Resource.js"
```

Added in v2.0.0

## From "./Runtime.js"

Re-exports all named exports from the "./Runtime.js" module as `Runtime`.

**Signature**

```ts
export * as Runtime from "./Runtime.js"
```

Added in v2.0.0

## From "./RuntimeFlags.js"

Re-exports all named exports from the "./RuntimeFlags.js" module as `RuntimeFlags`.

**Signature**

```ts
export * as RuntimeFlags from "./RuntimeFlags.js"
```

Added in v2.0.0

## From "./RuntimeFlagsPatch.js"

Re-exports all named exports from the "./RuntimeFlagsPatch.js" module as `RuntimeFlagsPatch`.

**Signature**

```ts
export * as RuntimeFlagsPatch from "./RuntimeFlagsPatch.js"
```

Added in v2.0.0

## From "./STM.js"

Re-exports all named exports from the "./STM.js" module as `STM`.

**Signature**

```ts
export * as STM from "./STM.js"
```

Added in v2.0.0

## From "./Schedule.js"

Re-exports all named exports from the "./Schedule.js" module as `Schedule`.

**Signature**

```ts
export * as Schedule from "./Schedule.js"
```

Added in v2.0.0

## From "./ScheduleDecision.js"

Re-exports all named exports from the "./ScheduleDecision.js" module as `ScheduleDecision`.

**Signature**

```ts
export * as ScheduleDecision from "./ScheduleDecision.js"
```

Added in v2.0.0

## From "./ScheduleInterval.js"

Re-exports all named exports from the "./ScheduleInterval.js" module as `ScheduleInterval`.

**Signature**

```ts
export * as ScheduleInterval from "./ScheduleInterval.js"
```

Added in v2.0.0

## From "./ScheduleIntervals.js"

Re-exports all named exports from the "./ScheduleIntervals.js" module as `ScheduleIntervals`.

**Signature**

```ts
export * as ScheduleIntervals from "./ScheduleIntervals.js"
```

Added in v2.0.0

## From "./Scheduler.js"

Re-exports all named exports from the "./Scheduler.js" module as `Scheduler`.

**Signature**

```ts
export * as Scheduler from "./Scheduler.js"
```

Added in v2.0.0

## From "./Scope.js"

Re-exports all named exports from the "./Scope.js" module as `Scope`.

**Signature**

```ts
export * as Scope from "./Scope.js"
```

Added in v2.0.0

## From "./ScopedCache.js"

Re-exports all named exports from the "./ScopedCache.js" module as `ScopedCache`.

**Signature**

```ts
export * as ScopedCache from "./ScopedCache.js"
```

Added in v2.0.0

## From "./ScopedRef.js"

Re-exports all named exports from the "./ScopedRef.js" module as `ScopedRef`.

**Signature**

```ts
export * as ScopedRef from "./ScopedRef.js"
```

Added in v2.0.0

## From "./SingleProducerAsyncInput.js"

Re-exports all named exports from the "./SingleProducerAsyncInput.js" module as `SingleProducerAsyncInput`.

**Signature**

```ts
export * as SingleProducerAsyncInput from "./SingleProducerAsyncInput.js"
```

Added in v2.0.0

## From "./Sink.js"

Re-exports all named exports from the "./Sink.js" module as `Sink`.

**Signature**

```ts
export * as Sink from "./Sink.js"
```

Added in v2.0.0

## From "./SortedMap.js"

Re-exports all named exports from the "./SortedMap.js" module as `SortedMap`.

**Signature**

```ts
export * as SortedMap from "./SortedMap.js"
```

Added in v2.0.0

## From "./SortedSet.js"

Re-exports all named exports from the "./SortedSet.js" module as `SortedSet`.

**Signature**

```ts
export * as SortedSet from "./SortedSet.js"
```

Added in v2.0.0

## From "./Stream.js"

Re-exports all named exports from the "./Stream.js" module as `Stream`.

**Signature**

```ts
export * as Stream from "./Stream.js"
```

Added in v2.0.0

## From "./StreamEmit.js"

Re-exports all named exports from the "./StreamEmit.js" module as `StreamEmit`.

**Signature**

```ts
export * as StreamEmit from "./StreamEmit.js"
```

Added in v2.0.0

## From "./StreamHaltStrategy.js"

Re-exports all named exports from the "./StreamHaltStrategy.js" module as `StreamHaltStrategy`.

**Signature**

```ts
export * as StreamHaltStrategy from "./StreamHaltStrategy.js"
```

Added in v2.0.0

## From "./Streamable.js"

Re-exports all named exports from the "./Streamable.js" module as `Streamable`.

**Signature**

```ts
export * as Streamable from "./Streamable.js"
```

Added in v2.0.0

## From "./String.js"

This module provides utility functions and type class instances for working with the `string` type in TypeScript.
It includes functions for basic string manipulation, as well as type class instances for
`Equivalence` and `Order`.

**Signature**

```ts
export * as String from "./String.js"
```

Added in v2.0.0

## From "./Struct.js"

This module provides utility functions for working with structs in TypeScript.

**Signature**

```ts
export * as Struct from "./Struct.js"
```

Added in v2.0.0

## From "./SubscriptionRef.js"

Re-exports all named exports from the "./SubscriptionRef.js" module as `SubscriptionRef`.

**Signature**

```ts
export * as SubscriptionRef from "./SubscriptionRef.js"
```

Added in v2.0.0

## From "./Supervisor.js"

A `Supervisor<T>` is allowed to supervise the launching and termination of
fibers, producing some visible value of type `T` from the supervision.

**Signature**

```ts
export * as Supervisor from "./Supervisor.js"
```

Added in v2.0.0

## From "./Symbol.js"

Re-exports all named exports from the "./Symbol.js" module as `Symbol`.

**Signature**

```ts
export * as Symbol from "./Symbol.js"
```

Added in v2.0.0

## From "./SynchronizedRef.js"

Re-exports all named exports from the "./SynchronizedRef.js" module as `SynchronizedRef`.

**Signature**

```ts
export * as SynchronizedRef from "./SynchronizedRef.js"
```

Added in v2.0.0

## From "./TArray.js"

Re-exports all named exports from the "./TArray.js" module as `TArray`.

**Signature**

```ts
export * as TArray from "./TArray.js"
```

Added in v2.0.0

## From "./TDeferred.js"

Re-exports all named exports from the "./TDeferred.js" module as `TDeferred`.

**Signature**

```ts
export * as TDeferred from "./TDeferred.js"
```

Added in v2.0.0

## From "./TMap.js"

Re-exports all named exports from the "./TMap.js" module as `TMap`.

**Signature**

```ts
export * as TMap from "./TMap.js"
```

Added in v2.0.0

## From "./TPriorityQueue.js"

Re-exports all named exports from the "./TPriorityQueue.js" module as `TPriorityQueue`.

**Signature**

```ts
export * as TPriorityQueue from "./TPriorityQueue.js"
```

Added in v2.0.0

## From "./TPubSub.js"

Re-exports all named exports from the "./TPubSub.js" module as `TPubSub`.

**Signature**

```ts
export * as TPubSub from "./TPubSub.js"
```

Added in v2.0.0

## From "./TQueue.js"

Re-exports all named exports from the "./TQueue.js" module as `TQueue`.

**Signature**

```ts
export * as TQueue from "./TQueue.js"
```

Added in v2.0.0

## From "./TRandom.js"

Re-exports all named exports from the "./TRandom.js" module as `TRandom`.

**Signature**

```ts
export * as TRandom from "./TRandom.js"
```

Added in v2.0.0

## From "./TReentrantLock.js"

Re-exports all named exports from the "./TReentrantLock.js" module as `TReentrantLock`.

**Signature**

```ts
export * as TReentrantLock from "./TReentrantLock.js"
```

Added in v2.0.0

## From "./TRef.js"

Re-exports all named exports from the "./TRef.js" module as `TRef`.

**Signature**

```ts
export * as TRef from "./TRef.js"
```

Added in v2.0.0

## From "./TSemaphore.js"

Re-exports all named exports from the "./TSemaphore.js" module as `TSemaphore`.

**Signature**

```ts
export * as TSemaphore from "./TSemaphore.js"
```

Added in v2.0.0

## From "./TSet.js"

Re-exports all named exports from the "./TSet.js" module as `TSet`.

**Signature**

```ts
export * as TSet from "./TSet.js"
```

Added in v2.0.0

## From "./Take.js"

Re-exports all named exports from the "./Take.js" module as `Take`.

**Signature**

```ts
export * as Take from "./Take.js"
```

Added in v2.0.0

## From "./TestAnnotation.js"

Re-exports all named exports from the "./TestAnnotation.js" module as `TestAnnotation`.

**Signature**

```ts
export * as TestAnnotation from "./TestAnnotation.js"
```

Added in v2.0.0

## From "./TestAnnotationMap.js"

Re-exports all named exports from the "./TestAnnotationMap.js" module as `TestAnnotationMap`.

**Signature**

```ts
export * as TestAnnotationMap from "./TestAnnotationMap.js"
```

Added in v2.0.0

## From "./TestAnnotations.js"

Re-exports all named exports from the "./TestAnnotations.js" module as `TestAnnotations`.

**Signature**

```ts
export * as TestAnnotations from "./TestAnnotations.js"
```

Added in v2.0.0

## From "./TestClock.js"

Re-exports all named exports from the "./TestClock.js" module as `TestClock`.

**Signature**

```ts
export * as TestClock from "./TestClock.js"
```

Added in v2.0.0

## From "./TestConfig.js"

Re-exports all named exports from the "./TestConfig.js" module as `TestConfig`.

**Signature**

```ts
export * as TestConfig from "./TestConfig.js"
```

Added in v2.0.0

## From "./TestContext.js"

Re-exports all named exports from the "./TestContext.js" module as `TestContext`.

**Signature**

```ts
export * as TestContext from "./TestContext.js"
```

Added in v2.0.0

## From "./TestLive.js"

Re-exports all named exports from the "./TestLive.js" module as `TestLive`.

**Signature**

```ts
export * as TestLive from "./TestLive.js"
```

Added in v2.0.0

## From "./TestServices.js"

Re-exports all named exports from the "./TestServices.js" module as `TestServices`.

**Signature**

```ts
export * as TestServices from "./TestServices.js"
```

Added in v2.0.0

## From "./TestSized.js"

Re-exports all named exports from the "./TestSized.js" module as `TestSized`.

**Signature**

```ts
export * as TestSized from "./TestSized.js"
```

Added in v2.0.0

## From "./Tracer.js"

Re-exports all named exports from the "./Tracer.js" module as `Tracer`.

**Signature**

```ts
export * as Tracer from "./Tracer.js"
```

Added in v2.0.0

## From "./Tuple.js"

This module provides utility functions for working with tuples in TypeScript.

**Signature**

```ts
export * as Tuple from "./Tuple.js"
```

Added in v2.0.0

## From "./Types.js"

A collection of types that are commonly used types.

**Signature**

```ts
export * as Types from "./Types.js"
```

Added in v2.0.0

## From "./Unify.js"

Re-exports all named exports from the "./Unify.js" module as `Unify`.

**Signature**

```ts
export * as Unify from "./Unify.js"
```

Added in v2.0.0

## From "./UpstreamPullRequest.js"

Re-exports all named exports from the "./UpstreamPullRequest.js" module as `UpstreamPullRequest`.

**Signature**

```ts
export * as UpstreamPullRequest from "./UpstreamPullRequest.js"
```

Added in v2.0.0

## From "./UpstreamPullStrategy.js"

Re-exports all named exports from the "./UpstreamPullStrategy.js" module as `UpstreamPullStrategy`.

**Signature**

```ts
export * as UpstreamPullStrategy from "./UpstreamPullStrategy.js"
```

Added in v2.0.0

## From "./Utils.js"

Re-exports all named exports from the "./Utils.js" module as `Utils`.

**Signature**

```ts
export * as Utils from "./Utils.js"
```

Added in v2.0.0

# utils

## absurd

**Signature**

```ts
export declare const absurd: <A>(_: never) => A
```

Added in v2.0.0

## flow

**Signature**

```ts
export declare const flow: typeof flow
```

Added in v2.0.0

## hole

**Signature**

```ts
export declare const hole: <T>() => T
```

Added in v2.0.0

## identity

**Signature**

```ts
export declare const identity: <A>(a: A) => A
```

Added in v2.0.0

## pipe

**Signature**

```ts
export declare const pipe: typeof pipe
```

Added in v2.0.0

## unsafeCoerce

**Signature**

```ts
export declare const unsafeCoerce: <A, B>(a: A) => B
```

Added in v2.0.0
