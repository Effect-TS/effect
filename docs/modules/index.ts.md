---
title: index.ts
nav_order: 51
parent: Modules
---

## index overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [exports](#exports)
  - [From "./Bigint"](#from-bigint)
  - [From "./Boolean"](#from-boolean)
  - [From "./Brand"](#from-brand)
  - [From "./Cache"](#from-cache)
  - [From "./Cause"](#from-cause)
  - [From "./Channel"](#from-channel)
  - [From "./ChannelChildExecutorDecision"](#from-channelchildexecutordecision)
  - [From "./ChannelMergeDecision"](#from-channelmergedecision)
  - [From "./ChannelMergeState"](#from-channelmergestate)
  - [From "./ChannelMergeStrategy"](#from-channelmergestrategy)
  - [From "./ChannelSingleProducerAsyncInput"](#from-channelsingleproducerasyncinput)
  - [From "./ChannelUpstreamPullRequest"](#from-channelupstreampullrequest)
  - [From "./ChannelUpstreamPullStrategy"](#from-channelupstreampullstrategy)
  - [From "./Chunk"](#from-chunk)
  - [From "./Clock"](#from-clock)
  - [From "./Config"](#from-config)
  - [From "./ConfigError"](#from-configerror)
  - [From "./ConfigProvider"](#from-configprovider)
  - [From "./ConfigProviderPathPatch"](#from-configproviderpathpatch)
  - [From "./ConfigSecret"](#from-configsecret)
  - [From "./Console"](#from-console)
  - [From "./Context"](#from-context)
  - [From "./Data"](#from-data)
  - [From "./DefaultServices"](#from-defaultservices)
  - [From "./Deferred"](#from-deferred)
  - [From "./Differ"](#from-differ)
  - [From "./Duration"](#from-duration)
  - [From "./Effect"](#from-effect)
  - [From "./Effectable"](#from-effectable)
  - [From "./Either"](#from-either)
  - [From "./Encoding"](#from-encoding)
  - [From "./Equal"](#from-equal)
  - [From "./Equivalence"](#from-equivalence)
  - [From "./Error"](#from-error)
  - [From "./ExecutionStrategy"](#from-executionstrategy)
  - [From "./Exit"](#from-exit)
  - [From "./Fiber"](#from-fiber)
  - [From "./FiberId"](#from-fiberid)
  - [From "./FiberRef"](#from-fiberref)
  - [From "./FiberRefs"](#from-fiberrefs)
  - [From "./FiberRefsPatch"](#from-fiberrefspatch)
  - [From "./FiberStatus"](#from-fiberstatus)
  - [From "./Function"](#from-function)
  - [From "./GlobalValue"](#from-globalvalue)
  - [From "./GroupBy"](#from-groupby)
  - [From "./HKT"](#from-hkt)
  - [From "./Hash"](#from-hash)
  - [From "./HashMap"](#from-hashmap)
  - [From "./HashSet"](#from-hashset)
  - [From "./Hub"](#from-hub)
  - [From "./Inspectable"](#from-inspectable)
  - [From "./KeyedPool"](#from-keyedpool)
  - [From "./Layer"](#from-layer)
  - [From "./List"](#from-list)
  - [From "./LogLevel"](#from-loglevel)
  - [From "./LogSpan"](#from-logspan)
  - [From "./Logger"](#from-logger)
  - [From "./Metric"](#from-metric)
  - [From "./MetricBoundaries"](#from-metricboundaries)
  - [From "./MetricHook"](#from-metrichook)
  - [From "./MetricKey"](#from-metrickey)
  - [From "./MetricKeyType"](#from-metrickeytype)
  - [From "./MetricLabel"](#from-metriclabel)
  - [From "./MetricPair"](#from-metricpair)
  - [From "./MetricPolling"](#from-metricpolling)
  - [From "./MetricRegistry"](#from-metricregistry)
  - [From "./MetricState"](#from-metricstate)
  - [From "./MutableHashMap"](#from-mutablehashmap)
  - [From "./MutableHashSet"](#from-mutablehashset)
  - [From "./MutableList"](#from-mutablelist)
  - [From "./MutableQueue"](#from-mutablequeue)
  - [From "./MutableRef"](#from-mutableref)
  - [From "./NonEmptyIterable"](#from-nonemptyiterable)
  - [From "./Number"](#from-number)
  - [From "./Option"](#from-option)
  - [From "./Order"](#from-order)
  - [From "./Ordering"](#from-ordering)
  - [From "./Pipeable"](#from-pipeable)
  - [From "./Pool"](#from-pool)
  - [From "./Predicate"](#from-predicate)
  - [From "./Queue"](#from-queue)
  - [From "./Random"](#from-random)
  - [From "./ReadonlyArray"](#from-readonlyarray)
  - [From "./ReadonlyRecord"](#from-readonlyrecord)
  - [From "./RedBlackTree"](#from-redblacktree)
  - [From "./Ref"](#from-ref)
  - [From "./Reloadable"](#from-reloadable)
  - [From "./Request"](#from-request)
  - [From "./RequestBlock"](#from-requestblock)
  - [From "./RequestResolver"](#from-requestresolver)
  - [From "./Resource"](#from-resource)
  - [From "./Runtime"](#from-runtime)
  - [From "./RuntimeFlags"](#from-runtimeflags)
  - [From "./RuntimeFlagsPatch"](#from-runtimeflagspatch)
  - [From "./STM"](#from-stm)
  - [From "./Schedule"](#from-schedule)
  - [From "./ScheduleDecision"](#from-scheduledecision)
  - [From "./ScheduleInterval"](#from-scheduleinterval)
  - [From "./ScheduleIntervals"](#from-scheduleintervals)
  - [From "./Scheduler"](#from-scheduler)
  - [From "./Scope"](#from-scope)
  - [From "./ScopedCache"](#from-scopedcache)
  - [From "./ScopedRef"](#from-scopedref)
  - [From "./Sink"](#from-sink)
  - [From "./SortedMap"](#from-sortedmap)
  - [From "./SortedSet"](#from-sortedset)
  - [From "./Stream"](#from-stream)
  - [From "./StreamEmit"](#from-streamemit)
  - [From "./StreamHaltStrategy"](#from-streamhaltstrategy)
  - [From "./String"](#from-string)
  - [From "./Struct"](#from-struct)
  - [From "./SubscriptionRef"](#from-subscriptionref)
  - [From "./Supervisor"](#from-supervisor)
  - [From "./Symbol"](#from-symbol)
  - [From "./SynchronizedRef"](#from-synchronizedref)
  - [From "./TArray"](#from-tarray)
  - [From "./TDeferred"](#from-tdeferred)
  - [From "./THub"](#from-thub)
  - [From "./TMap"](#from-tmap)
  - [From "./TPriorityQueue"](#from-tpriorityqueue)
  - [From "./TQueue"](#from-tqueue)
  - [From "./TRandom"](#from-trandom)
  - [From "./TReentrantLock"](#from-treentrantlock)
  - [From "./TRef"](#from-tref)
  - [From "./TSemaphore"](#from-tsemaphore)
  - [From "./TSet"](#from-tset)
  - [From "./Take"](#from-take)
  - [From "./TestAnnotation"](#from-testannotation)
  - [From "./TestAnnotationMap"](#from-testannotationmap)
  - [From "./TestAnnotations"](#from-testannotations)
  - [From "./TestClock"](#from-testclock)
  - [From "./TestConfig"](#from-testconfig)
  - [From "./TestContext"](#from-testcontext)
  - [From "./TestLive"](#from-testlive)
  - [From "./TestServices"](#from-testservices)
  - [From "./TestSized"](#from-testsized)
  - [From "./Tracer"](#from-tracer)
  - [From "./Tuple"](#from-tuple)
  - [From "./Types"](#from-types)
  - [From "./Unify"](#from-unify)
  - [From "./Utils"](#from-utils)
- [utils](#utils)
  - [absurd](#absurd)
  - [flow](#flow)
  - [hole](#hole)
  - [identity](#identity)
  - [pipe](#pipe)
  - [unsafeCoerce](#unsafecoerce)

---

# exports

## From "./Bigint"

This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Bigint from './Bigint'
```

Added in v2.0.0

## From "./Boolean"

This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
It includes functions for basic boolean operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Boolean from './Boolean'
```

Added in v2.0.0

## From "./Brand"

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
export * as Brand from './Brand'
```

Added in v2.0.0

## From "./Cache"

Re-exports all named exports from the "./Cache" module as "Cache".

**Signature**

```ts
export * as Cache from './Cache'
```

Added in v2.0.0

## From "./Cause"

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
export * as Cause from './Cause'
```

Added in v2.0.0

## From "./Channel"

Re-exports all named exports from the "./Channel" module as "Channel".

**Signature**

```ts
export * as Channel from './Channel'
```

Added in v2.0.0

## From "./ChannelChildExecutorDecision"

Re-exports all named exports from the "./ChannelChildExecutorDecision" module as "ChannelChildExecutorDecision".

**Signature**

```ts
export * as ChannelChildExecutorDecision from './ChannelChildExecutorDecision'
```

Added in v2.0.0

## From "./ChannelMergeDecision"

Re-exports all named exports from the "./ChannelMergeDecision" module as "ChannelMergeDecision".

**Signature**

```ts
export * as ChannelMergeDecision from './ChannelMergeDecision'
```

Added in v2.0.0

## From "./ChannelMergeState"

Re-exports all named exports from the "./ChannelMergeState" module as "ChannelMergeState".

**Signature**

```ts
export * as ChannelMergeState from './ChannelMergeState'
```

Added in v2.0.0

## From "./ChannelMergeStrategy"

Re-exports all named exports from the "./ChannelMergeStrategy" module as "ChannelMergeStrategy".

**Signature**

```ts
export * as ChannelMergeStrategy from './ChannelMergeStrategy'
```

Added in v2.0.0

## From "./ChannelSingleProducerAsyncInput"

Re-exports all named exports from the "./ChannelSingleProducerAsyncInput" module as "ChannelSingleProducerAsyncInput".

**Signature**

```ts
export * as ChannelSingleProducerAsyncInput from './ChannelSingleProducerAsyncInput'
```

Added in v2.0.0

## From "./ChannelUpstreamPullRequest"

Re-exports all named exports from the "./ChannelUpstreamPullRequest" module as "ChannelUpstreamPullRequest".

**Signature**

```ts
export * as ChannelUpstreamPullRequest from './ChannelUpstreamPullRequest'
```

Added in v2.0.0

## From "./ChannelUpstreamPullStrategy"

Re-exports all named exports from the "./ChannelUpstreamPullStrategy" module as "ChannelUpstreamPullStrategy".

**Signature**

```ts
export * as ChannelUpstreamPullStrategy from './ChannelUpstreamPullStrategy'
```

Added in v2.0.0

## From "./Chunk"

Re-exports all named exports from the "./Chunk" module as "Chunk".

**Signature**

```ts
export * as Chunk from './Chunk'
```

Added in v2.0.0

## From "./Clock"

Re-exports all named exports from the "./Clock" module as "Clock".

**Signature**

```ts
export * as Clock from './Clock'
```

Added in v2.0.0

## From "./Config"

Re-exports all named exports from the "./Config" module as "Config".

**Signature**

```ts
export * as Config from './Config'
```

Added in v2.0.0

## From "./ConfigError"

Re-exports all named exports from the "./ConfigError" module as "ConfigError".

**Signature**

```ts
export * as ConfigError from './ConfigError'
```

Added in v2.0.0

## From "./ConfigProvider"

Re-exports all named exports from the "./ConfigProvider" module as "ConfigProvider".

**Signature**

```ts
export * as ConfigProvider from './ConfigProvider'
```

Added in v2.0.0

## From "./ConfigProviderPathPatch"

Re-exports all named exports from the "./ConfigProviderPathPatch" module as "ConfigProviderPathPatch".

**Signature**

```ts
export * as ConfigProviderPathPatch from './ConfigProviderPathPatch'
```

Added in v2.0.0

## From "./ConfigSecret"

Re-exports all named exports from the "./ConfigSecret" module as "ConfigSecret".

**Signature**

```ts
export * as ConfigSecret from './ConfigSecret'
```

Added in v2.0.0

## From "./Console"

Re-exports all named exports from the "./Console" module as "Console".

**Signature**

```ts
export * as Console from './Console'
```

Added in v2.0.0

## From "./Context"

This module provides a data structure called `Context` that can be used for dependency injection in effectful
programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
of related services that can be passed around as a single unit. This module provides functions to create, modify, and
query the contents of a `Context`, as well as a number of utility types for working with tags and services.

**Signature**

```ts
export * as Context from './Context'
```

Added in v2.0.0

## From "./Data"

Re-exports all named exports from the "./Data" module as "Data".

**Signature**

```ts
export * as Data from './Data'
```

Added in v2.0.0

## From "./DefaultServices"

Re-exports all named exports from the "./DefaultServices" module as "DefaultServices".

**Signature**

```ts
export * as DefaultServices from './DefaultServices'
```

Added in v2.0.0

## From "./Deferred"

Re-exports all named exports from the "./Deferred" module as "Deferred".

**Signature**

```ts
export * as Deferred from './Deferred'
```

Added in v2.0.0

## From "./Differ"

Re-exports all named exports from the "./Differ" module as "Differ".

**Signature**

```ts
export * as Differ from './Differ'
```

Added in v2.0.0

## From "./Duration"

Re-exports all named exports from the "./Duration" module as "Duration".

**Signature**

```ts
export * as Duration from './Duration'
```

Added in v2.0.0

## From "./Effect"

Re-exports all named exports from the "./Effect" module as "Effect".

**Signature**

```ts
export * as Effect from './Effect'
```

Added in v2.0.0

## From "./Effectable"

Re-exports all named exports from the "./Effectable" module as "Effectable".

**Signature**

```ts
export * as Effectable from './Effectable'
```

Added in v2.0.0

## From "./Either"

Re-exports all named exports from the "./Either" module as "Either".

**Signature**

```ts
export * as Either from './Either'
```

Added in v2.0.0

## From "./Encoding"

This module provides encoding & decoding functionality for:

- base64 (RFC4648)
- base64 (URL)
- hex

**Signature**

```ts
export * as Encoding from './Encoding'
```

Added in v2.0.0

## From "./Equal"

Re-exports all named exports from the "./Equal" module as "Equal".

**Signature**

```ts
export * as Equal from './Equal'
```

Added in v2.0.0

## From "./Equivalence"

This module provides an implementation of the `Equivalence` type class, which defines a binary relation
that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
These properties are also known in mathematics as an "equivalence relation".

**Signature**

```ts
export * as Equivalence from './Equivalence'
```

Added in v2.0.0

## From "./Error"

Re-exports all named exports from the "./Error" module as "Error".

**Signature**

```ts
export * as Error from './Error'
```

Added in v2.0.0

## From "./ExecutionStrategy"

Re-exports all named exports from the "./ExecutionStrategy" module as "ExecutionStrategy".

**Signature**

```ts
export * as ExecutionStrategy from './ExecutionStrategy'
```

Added in v2.0.0

## From "./Exit"

Re-exports all named exports from the "./Exit" module as "Exit".

**Signature**

```ts
export * as Exit from './Exit'
```

Added in v2.0.0

## From "./Fiber"

Re-exports all named exports from the "./Fiber" module as "Fiber".

**Signature**

```ts
export * as Fiber from './Fiber'
```

Added in v2.0.0

## From "./FiberId"

Re-exports all named exports from the "./FiberId" module as "FiberId".

**Signature**

```ts
export * as FiberId from './FiberId'
```

Added in v2.0.0

## From "./FiberRef"

Re-exports all named exports from the "./FiberRef" module as "FiberRef".

**Signature**

```ts
export * as FiberRef from './FiberRef'
```

Added in v2.0.0

## From "./FiberRefs"

Re-exports all named exports from the "./FiberRefs" module as "FiberRefs".

**Signature**

```ts
export * as FiberRefs from './FiberRefs'
```

Added in v2.0.0

## From "./FiberRefsPatch"

Re-exports all named exports from the "./FiberRefsPatch" module as "FiberRefsPatch".

**Signature**

```ts
export * as FiberRefsPatch from './FiberRefsPatch'
```

Added in v2.0.0

## From "./FiberStatus"

Re-exports all named exports from the "./FiberStatus" module as "FiberStatus".

**Signature**

```ts
export * as FiberStatus from './FiberStatus'
```

Added in v2.0.0

## From "./Function"

Re-exports all named exports from the "./Function" module as "Function".

**Signature**

```ts
export * as Function from './Function'
```

Added in v2.0.0

## From "./GlobalValue"

Re-exports all named exports from the "./GlobalValue" module as "GlobalValue".

**Signature**

```ts
export * as GlobalValue from './GlobalValue'
```

Added in v2.0.0

## From "./GroupBy"

Re-exports all named exports from the "./GroupBy" module as "GroupBy".

**Signature**

```ts
export * as GroupBy from './GroupBy'
```

Added in v2.0.0

## From "./HKT"

Re-exports all named exports from the "./HKT" module as "HKT".

**Signature**

```ts
export * as HKT from './HKT'
```

Added in v2.0.0

## From "./Hash"

Re-exports all named exports from the "./Hash" module as "Hash".

**Signature**

```ts
export * as Hash from './Hash'
```

Added in v2.0.0

## From "./HashMap"

Re-exports all named exports from the "./HashMap" module as "HashMap".

**Signature**

```ts
export * as HashMap from './HashMap'
```

Added in v2.0.0

## From "./HashSet"

Re-exports all named exports from the "./HashSet" module as "HashSet".

**Signature**

```ts
export * as HashSet from './HashSet'
```

Added in v2.0.0

## From "./Hub"

Re-exports all named exports from the "./Hub" module as "Hub".

**Signature**

```ts
export * as Hub from './Hub'
```

Added in v2.0.0

## From "./Inspectable"

Re-exports all named exports from the "./Inspectable" module as "Inspectable".

**Signature**

```ts
export * as Inspectable from './Inspectable'
```

Added in v2.0.0

## From "./KeyedPool"

Re-exports all named exports from the "./KeyedPool" module as "KeyedPool".

**Signature**

```ts
export * as KeyedPool from './KeyedPool'
```

Added in v2.0.0

## From "./Layer"

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
export * as Layer from './Layer'
```

Added in v2.0.0

## From "./List"

A data type for immutable linked lists representing ordered collections of elements of type `A`.

This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.

**Performance**

- Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
- Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.

**Signature**

```ts
export * as List from './List'
```

Added in v2.0.0

## From "./LogLevel"

Re-exports all named exports from the "./LogLevel" module as "LogLevel".

**Signature**

```ts
export * as LogLevel from './LogLevel'
```

Added in v2.0.0

## From "./LogSpan"

Re-exports all named exports from the "./LogSpan" module as "LogSpan".

**Signature**

```ts
export * as LogSpan from './LogSpan'
```

Added in v2.0.0

## From "./Logger"

Re-exports all named exports from the "./Logger" module as "Logger".

**Signature**

```ts
export * as Logger from './Logger'
```

Added in v2.0.0

## From "./Metric"

Re-exports all named exports from the "./Metric" module as "Metric".

**Signature**

```ts
export * as Metric from './Metric'
```

Added in v2.0.0

## From "./MetricBoundaries"

Re-exports all named exports from the "./MetricBoundaries" module as "MetricBoundaries".

**Signature**

```ts
export * as MetricBoundaries from './MetricBoundaries'
```

Added in v2.0.0

## From "./MetricHook"

Re-exports all named exports from the "./MetricHook" module as "MetricHook".

**Signature**

```ts
export * as MetricHook from './MetricHook'
```

Added in v2.0.0

## From "./MetricKey"

Re-exports all named exports from the "./MetricKey" module as "MetricKey".

**Signature**

```ts
export * as MetricKey from './MetricKey'
```

Added in v2.0.0

## From "./MetricKeyType"

Re-exports all named exports from the "./MetricKeyType" module as "MetricKeyType".

**Signature**

```ts
export * as MetricKeyType from './MetricKeyType'
```

Added in v2.0.0

## From "./MetricLabel"

Re-exports all named exports from the "./MetricLabel" module as "MetricLabel".

**Signature**

```ts
export * as MetricLabel from './MetricLabel'
```

Added in v2.0.0

## From "./MetricPair"

Re-exports all named exports from the "./MetricPair" module as "MetricPair".

**Signature**

```ts
export * as MetricPair from './MetricPair'
```

Added in v2.0.0

## From "./MetricPolling"

Re-exports all named exports from the "./MetricPolling" module as "MetricPolling".

**Signature**

```ts
export * as MetricPolling from './MetricPolling'
```

Added in v2.0.0

## From "./MetricRegistry"

Re-exports all named exports from the "./MetricRegistry" module as "MetricRegistry".

**Signature**

```ts
export * as MetricRegistry from './MetricRegistry'
```

Added in v2.0.0

## From "./MetricState"

Re-exports all named exports from the "./MetricState" module as "MetricState".

**Signature**

```ts
export * as MetricState from './MetricState'
```

Added in v2.0.0

## From "./MutableHashMap"

Re-exports all named exports from the "./MutableHashMap" module as "MutableHashMap".

**Signature**

```ts
export * as MutableHashMap from './MutableHashMap'
```

Added in v2.0.0

## From "./MutableHashSet"

Re-exports all named exports from the "./MutableHashSet" module as "MutableHashSet".

**Signature**

```ts
export * as MutableHashSet from './MutableHashSet'
```

Added in v2.0.0

## From "./MutableList"

Re-exports all named exports from the "./MutableList" module as "MutableList".

**Signature**

```ts
export * as MutableList from './MutableList'
```

Added in v2.0.0

## From "./MutableQueue"

Re-exports all named exports from the "./MutableQueue" module as "MutableQueue".

**Signature**

```ts
export * as MutableQueue from './MutableQueue'
```

Added in v2.0.0

## From "./MutableRef"

Re-exports all named exports from the "./MutableRef" module as "MutableRef".

**Signature**

```ts
export * as MutableRef from './MutableRef'
```

Added in v2.0.0

## From "./NonEmptyIterable"

Re-exports all named exports from the "./NonEmptyIterable" module as "NonEmptyIterable".

**Signature**

```ts
export * as NonEmptyIterable from './NonEmptyIterable'
```

Added in v2.0.0

## From "./Number"

This module provides utility functions and type class instances for working with the `number` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Number from './Number'
```

Added in v2.0.0

## From "./Option"

Re-exports all named exports from the "./Option" module as "Option".

**Signature**

```ts
export * as Option from './Option'
```

Added in v2.0.0

## From "./Order"

Re-exports all named exports from the "./Order" module as "Order".

**Signature**

```ts
export * as Order from './Order'
```

Added in v2.0.0

## From "./Ordering"

Re-exports all named exports from the "./Ordering" module as "Ordering".

**Signature**

```ts
export * as Ordering from './Ordering'
```

Added in v2.0.0

## From "./Pipeable"

Re-exports all named exports from the "./Pipeable" module as "Pipeable".

**Signature**

```ts
export * as Pipeable from './Pipeable'
```

Added in v2.0.0

## From "./Pool"

Re-exports all named exports from the "./Pool" module as "Pool".

**Signature**

```ts
export * as Pool from './Pool'
```

Added in v2.0.0

## From "./Predicate"

Re-exports all named exports from the "./Predicate" module as "Predicate".

**Signature**

```ts
export * as Predicate from './Predicate'
```

Added in v2.0.0

## From "./Queue"

Re-exports all named exports from the "./Queue" module as "Queue".

**Signature**

```ts
export * as Queue from './Queue'
```

Added in v2.0.0

## From "./Random"

Re-exports all named exports from the "./Random" module as "Random".

**Signature**

```ts
export * as Random from './Random'
```

Added in v2.0.0

## From "./ReadonlyArray"

This module provides utility functions for working with arrays in TypeScript.

**Signature**

```ts
export * as ReadonlyArray from './ReadonlyArray'
```

Added in v2.0.0

## From "./ReadonlyRecord"

This module provides utility functions for working with records in TypeScript.

**Signature**

```ts
export * as ReadonlyRecord from './ReadonlyRecord'
```

Added in v2.0.0

## From "./RedBlackTree"

Re-exports all named exports from the "./RedBlackTree" module as "RedBlackTree".

**Signature**

```ts
export * as RedBlackTree from './RedBlackTree'
```

Added in v2.0.0

## From "./Ref"

Re-exports all named exports from the "./Ref" module as "Ref".

**Signature**

```ts
export * as Ref from './Ref'
```

Added in v2.0.0

## From "./Reloadable"

Re-exports all named exports from the "./Reloadable" module as "Reloadable".

**Signature**

```ts
export * as Reloadable from './Reloadable'
```

Added in v2.0.0

## From "./Request"

Re-exports all named exports from the "./Request" module as "Request".

**Signature**

```ts
export * as Request from './Request'
```

Added in v2.0.0

## From "./RequestBlock"

Re-exports all named exports from the "./RequestBlock" module as "RequestBlock".

**Signature**

```ts
export * as RequestBlock from './RequestBlock'
```

Added in v2.0.0

## From "./RequestResolver"

Re-exports all named exports from the "./RequestResolver" module as "RequestResolver".

**Signature**

```ts
export * as RequestResolver from './RequestResolver'
```

Added in v2.0.0

## From "./Resource"

Re-exports all named exports from the "./Resource" module as "Resource".

**Signature**

```ts
export * as Resource from './Resource'
```

Added in v2.0.0

## From "./Runtime"

Re-exports all named exports from the "./Runtime" module as "Runtime".

**Signature**

```ts
export * as Runtime from './Runtime'
```

Added in v2.0.0

## From "./RuntimeFlags"

Re-exports all named exports from the "./RuntimeFlags" module as "RuntimeFlags".

**Signature**

```ts
export * as RuntimeFlags from './RuntimeFlags'
```

Added in v2.0.0

## From "./RuntimeFlagsPatch"

Re-exports all named exports from the "./RuntimeFlagsPatch" module as "RuntimeFlagsPatch".

**Signature**

```ts
export * as RuntimeFlagsPatch from './RuntimeFlagsPatch'
```

Added in v2.0.0

## From "./STM"

Re-exports all named exports from the "./STM" module as "STM".

**Signature**

```ts
export * as STM from './STM'
```

Added in v2.0.0

## From "./Schedule"

Re-exports all named exports from the "./Schedule" module as "Schedule".

**Signature**

```ts
export * as Schedule from './Schedule'
```

Added in v2.0.0

## From "./ScheduleDecision"

Re-exports all named exports from the "./ScheduleDecision" module as "ScheduleDecision".

**Signature**

```ts
export * as ScheduleDecision from './ScheduleDecision'
```

Added in v2.0.0

## From "./ScheduleInterval"

Re-exports all named exports from the "./ScheduleInterval" module as "ScheduleInterval".

**Signature**

```ts
export * as ScheduleInterval from './ScheduleInterval'
```

Added in v2.0.0

## From "./ScheduleIntervals"

Re-exports all named exports from the "./ScheduleIntervals" module as "ScheduleIntervals".

**Signature**

```ts
export * as ScheduleIntervals from './ScheduleIntervals'
```

Added in v2.0.0

## From "./Scheduler"

Re-exports all named exports from the "./Scheduler" module as "Scheduler".

**Signature**

```ts
export * as Scheduler from './Scheduler'
```

Added in v2.0.0

## From "./Scope"

Re-exports all named exports from the "./Scope" module as "Scope".

**Signature**

```ts
export * as Scope from './Scope'
```

Added in v2.0.0

## From "./ScopedCache"

Re-exports all named exports from the "./ScopedCache" module as "ScopedCache".

**Signature**

```ts
export * as ScopedCache from './ScopedCache'
```

Added in v2.0.0

## From "./ScopedRef"

Re-exports all named exports from the "./ScopedRef" module as "ScopedRef".

**Signature**

```ts
export * as ScopedRef from './ScopedRef'
```

Added in v2.0.0

## From "./Sink"

Re-exports all named exports from the "./Sink" module as "Sink".

**Signature**

```ts
export * as Sink from './Sink'
```

Added in v2.0.0

## From "./SortedMap"

Re-exports all named exports from the "./SortedMap" module as "SortedMap".

**Signature**

```ts
export * as SortedMap from './SortedMap'
```

Added in v2.0.0

## From "./SortedSet"

Re-exports all named exports from the "./SortedSet" module as "SortedSet".

**Signature**

```ts
export * as SortedSet from './SortedSet'
```

Added in v2.0.0

## From "./Stream"

Re-exports all named exports from the "./Stream" module as "Stream".

**Signature**

```ts
export * as Stream from './Stream'
```

Added in v2.0.0

## From "./StreamEmit"

Re-exports all named exports from the "./StreamEmit" module as "StreamEmit".

**Signature**

```ts
export * as StreamEmit from './StreamEmit'
```

Added in v2.0.0

## From "./StreamHaltStrategy"

Re-exports all named exports from the "./StreamHaltStrategy" module as "StreamHaltStrategy".

**Signature**

```ts
export * as StreamHaltStrategy from './StreamHaltStrategy'
```

Added in v2.0.0

## From "./String"

This module provides utility functions and type class instances for working with the `string` type in TypeScript.
It includes functions for basic string manipulation, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as String from './String'
```

Added in v2.0.0

## From "./Struct"

This module provides utility functions for working with structs in TypeScript.

**Signature**

```ts
export * as Struct from './Struct'
```

Added in v2.0.0

## From "./SubscriptionRef"

Re-exports all named exports from the "./SubscriptionRef" module as "SubscriptionRef".

**Signature**

```ts
export * as SubscriptionRef from './SubscriptionRef'
```

Added in v2.0.0

## From "./Supervisor"

A `Supervisor<T>` is allowed to supervise the launching and termination of
fibers, producing some visible value of type `T` from the supervision.

**Signature**

```ts
export * as Supervisor from './Supervisor'
```

Added in v2.0.0

## From "./Symbol"

Re-exports all named exports from the "./Symbol" module as "Symbol".

**Signature**

```ts
export * as Symbol from './Symbol'
```

Added in v2.0.0

## From "./SynchronizedRef"

Re-exports all named exports from the "./SynchronizedRef" module as "SynchronizedRef".

**Signature**

```ts
export * as SynchronizedRef from './SynchronizedRef'
```

Added in v2.0.0

## From "./TArray"

Re-exports all named exports from the "./TArray" module as "TArray".

**Signature**

```ts
export * as TArray from './TArray'
```

Added in v2.0.0

## From "./TDeferred"

Re-exports all named exports from the "./TDeferred" module as "TDeferred".

**Signature**

```ts
export * as TDeferred from './TDeferred'
```

Added in v2.0.0

## From "./THub"

Re-exports all named exports from the "./THub" module as "THub".

**Signature**

```ts
export * as THub from './THub'
```

Added in v2.0.0

## From "./TMap"

Re-exports all named exports from the "./TMap" module as "TMap".

**Signature**

```ts
export * as TMap from './TMap'
```

Added in v2.0.0

## From "./TPriorityQueue"

Re-exports all named exports from the "./TPriorityQueue" module as "TPriorityQueue".

**Signature**

```ts
export * as TPriorityQueue from './TPriorityQueue'
```

Added in v2.0.0

## From "./TQueue"

Re-exports all named exports from the "./TQueue" module as "TQueue".

**Signature**

```ts
export * as TQueue from './TQueue'
```

Added in v2.0.0

## From "./TRandom"

Re-exports all named exports from the "./TRandom" module as "TRandom".

**Signature**

```ts
export * as TRandom from './TRandom'
```

Added in v2.0.0

## From "./TReentrantLock"

Re-exports all named exports from the "./TReentrantLock" module as "TReentrantLock".

**Signature**

```ts
export * as TReentrantLock from './TReentrantLock'
```

Added in v2.0.0

## From "./TRef"

Re-exports all named exports from the "./TRef" module as "TRef".

**Signature**

```ts
export * as TRef from './TRef'
```

Added in v2.0.0

## From "./TSemaphore"

Re-exports all named exports from the "./TSemaphore" module as "TSemaphore".

**Signature**

```ts
export * as TSemaphore from './TSemaphore'
```

Added in v2.0.0

## From "./TSet"

Re-exports all named exports from the "./TSet" module as "TSet".

**Signature**

```ts
export * as TSet from './TSet'
```

Added in v2.0.0

## From "./Take"

Re-exports all named exports from the "./Take" module as "Take".

**Signature**

```ts
export * as Take from './Take'
```

Added in v2.0.0

## From "./TestAnnotation"

Re-exports all named exports from the "./TestAnnotation" module as "TestAnnotation".

**Signature**

```ts
export * as TestAnnotation from './TestAnnotation'
```

Added in v2.0.0

## From "./TestAnnotationMap"

Re-exports all named exports from the "./TestAnnotationMap" module as "TestAnnotationMap".

**Signature**

```ts
export * as TestAnnotationMap from './TestAnnotationMap'
```

Added in v2.0.0

## From "./TestAnnotations"

Re-exports all named exports from the "./TestAnnotations" module as "TestAnnotations".

**Signature**

```ts
export * as TestAnnotations from './TestAnnotations'
```

Added in v2.0.0

## From "./TestClock"

Re-exports all named exports from the "./TestClock" module as "TestClock".

**Signature**

```ts
export * as TestClock from './TestClock'
```

Added in v2.0.0

## From "./TestConfig"

Re-exports all named exports from the "./TestConfig" module as "TestConfig".

**Signature**

```ts
export * as TestConfig from './TestConfig'
```

Added in v2.0.0

## From "./TestContext"

Re-exports all named exports from the "./TestContext" module as "TestContext".

**Signature**

```ts
export * as TestContext from './TestContext'
```

Added in v2.0.0

## From "./TestLive"

Re-exports all named exports from the "./TestLive" module as "TestLive".

**Signature**

```ts
export * as TestLive from './TestLive'
```

Added in v2.0.0

## From "./TestServices"

Re-exports all named exports from the "./TestServices" module as "TestServices".

**Signature**

```ts
export * as TestServices from './TestServices'
```

Added in v2.0.0

## From "./TestSized"

Re-exports all named exports from the "./TestSized" module as "TestSized".

**Signature**

```ts
export * as TestSized from './TestSized'
```

Added in v2.0.0

## From "./Tracer"

Re-exports all named exports from the "./Tracer" module as "Tracer".

**Signature**

```ts
export * as Tracer from './Tracer'
```

Added in v2.0.0

## From "./Tuple"

This module provides utility functions for working with tuples in TypeScript.

**Signature**

```ts
export * as Tuple from './Tuple'
```

Added in v2.0.0

## From "./Types"

A collection of types that are commonly used types.

**Signature**

```ts
export * as Types from './Types'
```

Added in v2.0.0

## From "./Unify"

Re-exports all named exports from the "./Unify" module as "Unify".

**Signature**

```ts
export * as Unify from './Unify'
```

Added in v2.0.0

## From "./Utils"

Re-exports all named exports from the "./Utils" module as "Utils".

**Signature**

```ts
export * as Utils from './Utils'
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
