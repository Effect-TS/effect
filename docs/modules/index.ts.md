---
title: index.ts
nav_order: 49
parent: Modules
---

## index overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [exports](#exports)
  - [From "effect/Bigint"](#from-effectbigint)
  - [From "effect/Boolean"](#from-effectboolean)
  - [From "effect/Brand"](#from-effectbrand)
  - [From "effect/Cache"](#from-effectcache)
  - [From "effect/Cause"](#from-effectcause)
  - [From "effect/Channel"](#from-effectchannel)
  - [From "effect/ChannelChildExecutorDecision"](#from-effectchannelchildexecutordecision)
  - [From "effect/ChannelMergeDecision"](#from-effectchannelmergedecision)
  - [From "effect/ChannelMergeState"](#from-effectchannelmergestate)
  - [From "effect/ChannelMergeStrategy"](#from-effectchannelmergestrategy)
  - [From "effect/ChannelSingleProducerAsyncInput"](#from-effectchannelsingleproducerasyncinput)
  - [From "effect/ChannelUpstreamPullRequest"](#from-effectchannelupstreampullrequest)
  - [From "effect/ChannelUpstreamPullStrategy"](#from-effectchannelupstreampullstrategy)
  - [From "effect/Chunk"](#from-effectchunk)
  - [From "effect/Clock"](#from-effectclock)
  - [From "effect/Config"](#from-effectconfig)
  - [From "effect/ConfigError"](#from-effectconfigerror)
  - [From "effect/ConfigProvider"](#from-effectconfigprovider)
  - [From "effect/ConfigProviderPathPatch"](#from-effectconfigproviderpathpatch)
  - [From "effect/ConfigSecret"](#from-effectconfigsecret)
  - [From "effect/Console"](#from-effectconsole)
  - [From "effect/Context"](#from-effectcontext)
  - [From "effect/Data"](#from-effectdata)
  - [From "effect/DefaultServices"](#from-effectdefaultservices)
  - [From "effect/Deferred"](#from-effectdeferred)
  - [From "effect/Differ"](#from-effectdiffer)
  - [From "effect/Duration"](#from-effectduration)
  - [From "effect/Effect"](#from-effecteffect)
  - [From "effect/Effectable"](#from-effecteffectable)
  - [From "effect/Either"](#from-effecteither)
  - [From "effect/Encoding"](#from-effectencoding)
  - [From "effect/Equal"](#from-effectequal)
  - [From "effect/Equivalence"](#from-effectequivalence)
  - [From "effect/ExecutionStrategy"](#from-effectexecutionstrategy)
  - [From "effect/Exit"](#from-effectexit)
  - [From "effect/Fiber"](#from-effectfiber)
  - [From "effect/FiberId"](#from-effectfiberid)
  - [From "effect/FiberRef"](#from-effectfiberref)
  - [From "effect/FiberRefs"](#from-effectfiberrefs)
  - [From "effect/FiberRefsPatch"](#from-effectfiberrefspatch)
  - [From "effect/FiberStatus"](#from-effectfiberstatus)
  - [From "effect/Function"](#from-effectfunction)
  - [From "effect/GlobalValue"](#from-effectglobalvalue)
  - [From "effect/GroupBy"](#from-effectgroupby)
  - [From "effect/HKT"](#from-effecthkt)
  - [From "effect/Hash"](#from-effecthash)
  - [From "effect/HashMap"](#from-effecthashmap)
  - [From "effect/HashSet"](#from-effecthashset)
  - [From "effect/Inspectable"](#from-effectinspectable)
  - [From "effect/KeyedPool"](#from-effectkeyedpool)
  - [From "effect/Layer"](#from-effectlayer)
  - [From "effect/List"](#from-effectlist)
  - [From "effect/LogLevel"](#from-effectloglevel)
  - [From "effect/LogSpan"](#from-effectlogspan)
  - [From "effect/Logger"](#from-effectlogger)
  - [From "effect/Metric"](#from-effectmetric)
  - [From "effect/MetricBoundaries"](#from-effectmetricboundaries)
  - [From "effect/MetricHook"](#from-effectmetrichook)
  - [From "effect/MetricKey"](#from-effectmetrickey)
  - [From "effect/MetricKeyType"](#from-effectmetrickeytype)
  - [From "effect/MetricLabel"](#from-effectmetriclabel)
  - [From "effect/MetricPair"](#from-effectmetricpair)
  - [From "effect/MetricPolling"](#from-effectmetricpolling)
  - [From "effect/MetricRegistry"](#from-effectmetricregistry)
  - [From "effect/MetricState"](#from-effectmetricstate)
  - [From "effect/MutableHashMap"](#from-effectmutablehashmap)
  - [From "effect/MutableHashSet"](#from-effectmutablehashset)
  - [From "effect/MutableList"](#from-effectmutablelist)
  - [From "effect/MutableQueue"](#from-effectmutablequeue)
  - [From "effect/MutableRef"](#from-effectmutableref)
  - [From "effect/NonEmptyIterable"](#from-effectnonemptyiterable)
  - [From "effect/Number"](#from-effectnumber)
  - [From "effect/Option"](#from-effectoption)
  - [From "effect/Order"](#from-effectorder)
  - [From "effect/Ordering"](#from-effectordering)
  - [From "effect/Pipeable"](#from-effectpipeable)
  - [From "effect/Pool"](#from-effectpool)
  - [From "effect/Predicate"](#from-effectpredicate)
  - [From "effect/PubSub"](#from-effectpubsub)
  - [From "effect/Queue"](#from-effectqueue)
  - [From "effect/Random"](#from-effectrandom)
  - [From "effect/ReadonlyArray"](#from-effectreadonlyarray)
  - [From "effect/ReadonlyRecord"](#from-effectreadonlyrecord)
  - [From "effect/RedBlackTree"](#from-effectredblacktree)
  - [From "effect/Ref"](#from-effectref)
  - [From "effect/Reloadable"](#from-effectreloadable)
  - [From "effect/Request"](#from-effectrequest)
  - [From "effect/RequestBlock"](#from-effectrequestblock)
  - [From "effect/RequestResolver"](#from-effectrequestresolver)
  - [From "effect/Resource"](#from-effectresource)
  - [From "effect/Runtime"](#from-effectruntime)
  - [From "effect/RuntimeFlags"](#from-effectruntimeflags)
  - [From "effect/RuntimeFlagsPatch"](#from-effectruntimeflagspatch)
  - [From "effect/STM"](#from-effectstm)
  - [From "effect/Schedule"](#from-effectschedule)
  - [From "effect/ScheduleDecision"](#from-effectscheduledecision)
  - [From "effect/ScheduleInterval"](#from-effectscheduleinterval)
  - [From "effect/ScheduleIntervals"](#from-effectscheduleintervals)
  - [From "effect/Scheduler"](#from-effectscheduler)
  - [From "effect/Scope"](#from-effectscope)
  - [From "effect/ScopedCache"](#from-effectscopedcache)
  - [From "effect/ScopedRef"](#from-effectscopedref)
  - [From "effect/Sink"](#from-effectsink)
  - [From "effect/SortedMap"](#from-effectsortedmap)
  - [From "effect/SortedSet"](#from-effectsortedset)
  - [From "effect/Stream"](#from-effectstream)
  - [From "effect/StreamEmit"](#from-effectstreamemit)
  - [From "effect/StreamHaltStrategy"](#from-effectstreamhaltstrategy)
  - [From "effect/Streamable"](#from-effectstreamable)
  - [From "effect/String"](#from-effectstring)
  - [From "effect/Struct"](#from-effectstruct)
  - [From "effect/SubscriptionRef"](#from-effectsubscriptionref)
  - [From "effect/Supervisor"](#from-effectsupervisor)
  - [From "effect/Symbol"](#from-effectsymbol)
  - [From "effect/SynchronizedRef"](#from-effectsynchronizedref)
  - [From "effect/TArray"](#from-effecttarray)
  - [From "effect/TDeferred"](#from-effecttdeferred)
  - [From "effect/TMap"](#from-effecttmap)
  - [From "effect/TPriorityQueue"](#from-effecttpriorityqueue)
  - [From "effect/TPubSub"](#from-effecttpubsub)
  - [From "effect/TQueue"](#from-effecttqueue)
  - [From "effect/TRandom"](#from-effecttrandom)
  - [From "effect/TReentrantLock"](#from-effecttreentrantlock)
  - [From "effect/TRef"](#from-effecttref)
  - [From "effect/TSemaphore"](#from-effecttsemaphore)
  - [From "effect/TSet"](#from-effecttset)
  - [From "effect/Take"](#from-effecttake)
  - [From "effect/TestAnnotation"](#from-effecttestannotation)
  - [From "effect/TestAnnotationMap"](#from-effecttestannotationmap)
  - [From "effect/TestAnnotations"](#from-effecttestannotations)
  - [From "effect/TestClock"](#from-effecttestclock)
  - [From "effect/TestConfig"](#from-effecttestconfig)
  - [From "effect/TestContext"](#from-effecttestcontext)
  - [From "effect/TestLive"](#from-effecttestlive)
  - [From "effect/TestServices"](#from-effecttestservices)
  - [From "effect/TestSized"](#from-effecttestsized)
  - [From "effect/Tracer"](#from-effecttracer)
  - [From "effect/Tuple"](#from-effecttuple)
  - [From "effect/Types"](#from-effecttypes)
  - [From "effect/Unify"](#from-effectunify)
  - [From "effect/Utils"](#from-effectutils)
- [utils](#utils)
  - [absurd](#absurd)
  - [flow](#flow)
  - [hole](#hole)
  - [identity](#identity)
  - [pipe](#pipe)
  - [unsafeCoerce](#unsafecoerce)

---

# exports

## From "effect/Bigint"

This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Bigint from 'effect/Bigint'
```

Added in v2.0.0

## From "effect/Boolean"

This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
It includes functions for basic boolean operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Boolean from 'effect/Boolean'
```

Added in v2.0.0

## From "effect/Brand"

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
export * as Brand from 'effect/Brand'
```

Added in v2.0.0

## From "effect/Cache"

Re-exports all named exports from the "effect/Cache" module as "Cache".

**Signature**

```ts
export * as Cache from 'effect/Cache'
```

Added in v2.0.0

## From "effect/Cause"

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
export * as Cause from 'effect/Cause'
```

Added in v2.0.0

## From "effect/Channel"

Re-exports all named exports from the "effect/Channel" module as "Channel".

**Signature**

```ts
export * as Channel from 'effect/Channel'
```

Added in v2.0.0

## From "effect/ChannelChildExecutorDecision"

Re-exports all named exports from the "effect/ChannelChildExecutorDecision" module as "ChannelChildExecutorDecision".

**Signature**

```ts
export * as ChannelChildExecutorDecision from 'effect/ChannelChildExecutorDecision'
```

Added in v2.0.0

## From "effect/ChannelMergeDecision"

Re-exports all named exports from the "effect/ChannelMergeDecision" module as "ChannelMergeDecision".

**Signature**

```ts
export * as ChannelMergeDecision from 'effect/ChannelMergeDecision'
```

Added in v2.0.0

## From "effect/ChannelMergeState"

Re-exports all named exports from the "effect/ChannelMergeState" module as "ChannelMergeState".

**Signature**

```ts
export * as ChannelMergeState from 'effect/ChannelMergeState'
```

Added in v2.0.0

## From "effect/ChannelMergeStrategy"

Re-exports all named exports from the "effect/ChannelMergeStrategy" module as "ChannelMergeStrategy".

**Signature**

```ts
export * as ChannelMergeStrategy from 'effect/ChannelMergeStrategy'
```

Added in v2.0.0

## From "effect/ChannelSingleProducerAsyncInput"

Re-exports all named exports from the "effect/ChannelSingleProducerAsyncInput" module as "ChannelSingleProducerAsyncInput".

**Signature**

```ts
export * as ChannelSingleProducerAsyncInput from 'effect/ChannelSingleProducerAsyncInput'
```

Added in v2.0.0

## From "effect/ChannelUpstreamPullRequest"

Re-exports all named exports from the "effect/ChannelUpstreamPullRequest" module as "ChannelUpstreamPullRequest".

**Signature**

```ts
export * as ChannelUpstreamPullRequest from 'effect/ChannelUpstreamPullRequest'
```

Added in v2.0.0

## From "effect/ChannelUpstreamPullStrategy"

Re-exports all named exports from the "effect/ChannelUpstreamPullStrategy" module as "ChannelUpstreamPullStrategy".

**Signature**

```ts
export * as ChannelUpstreamPullStrategy from 'effect/ChannelUpstreamPullStrategy'
```

Added in v2.0.0

## From "effect/Chunk"

Re-exports all named exports from the "effect/Chunk" module as "Chunk".

**Signature**

```ts
export * as Chunk from 'effect/Chunk'
```

Added in v2.0.0

## From "effect/Clock"

Re-exports all named exports from the "effect/Clock" module as "Clock".

**Signature**

```ts
export * as Clock from 'effect/Clock'
```

Added in v2.0.0

## From "effect/Config"

Re-exports all named exports from the "effect/Config" module as "Config".

**Signature**

```ts
export * as Config from 'effect/Config'
```

Added in v2.0.0

## From "effect/ConfigError"

Re-exports all named exports from the "effect/ConfigError" module as "ConfigError".

**Signature**

```ts
export * as ConfigError from 'effect/ConfigError'
```

Added in v2.0.0

## From "effect/ConfigProvider"

Re-exports all named exports from the "effect/ConfigProvider" module as "ConfigProvider".

**Signature**

```ts
export * as ConfigProvider from 'effect/ConfigProvider'
```

Added in v2.0.0

## From "effect/ConfigProviderPathPatch"

Re-exports all named exports from the "effect/ConfigProviderPathPatch" module as "ConfigProviderPathPatch".

**Signature**

```ts
export * as ConfigProviderPathPatch from 'effect/ConfigProviderPathPatch'
```

Added in v2.0.0

## From "effect/ConfigSecret"

Re-exports all named exports from the "effect/ConfigSecret" module as "ConfigSecret".

**Signature**

```ts
export * as ConfigSecret from 'effect/ConfigSecret'
```

Added in v2.0.0

## From "effect/Console"

Re-exports all named exports from the "effect/Console" module as "Console".

**Signature**

```ts
export * as Console from 'effect/Console'
```

Added in v2.0.0

## From "effect/Context"

This module provides a data structure called `Context` that can be used for dependency injection in effectful
programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
of related services that can be passed around as a single unit. This module provides functions to create, modify, and
query the contents of a `Context`, as well as a number of utility types for working with tags and services.

**Signature**

```ts
export * as Context from 'effect/Context'
```

Added in v2.0.0

## From "effect/Data"

Re-exports all named exports from the "effect/Data" module as "Data".

**Signature**

```ts
export * as Data from 'effect/Data'
```

Added in v2.0.0

## From "effect/DefaultServices"

Re-exports all named exports from the "effect/DefaultServices" module as "DefaultServices".

**Signature**

```ts
export * as DefaultServices from 'effect/DefaultServices'
```

Added in v2.0.0

## From "effect/Deferred"

Re-exports all named exports from the "effect/Deferred" module as "Deferred".

**Signature**

```ts
export * as Deferred from 'effect/Deferred'
```

Added in v2.0.0

## From "effect/Differ"

Re-exports all named exports from the "effect/Differ" module as "Differ".

**Signature**

```ts
export * as Differ from 'effect/Differ'
```

Added in v2.0.0

## From "effect/Duration"

Re-exports all named exports from the "effect/Duration" module as "Duration".

**Signature**

```ts
export * as Duration from 'effect/Duration'
```

Added in v2.0.0

## From "effect/Effect"

Re-exports all named exports from the "effect/Effect" module as "Effect".

**Signature**

```ts
export * as Effect from 'effect/Effect'
```

Added in v2.0.0

## From "effect/Effectable"

Re-exports all named exports from the "effect/Effectable" module as "Effectable".

**Signature**

```ts
export * as Effectable from 'effect/Effectable'
```

Added in v2.0.0

## From "effect/Either"

Re-exports all named exports from the "effect/Either" module as "Either".

**Signature**

```ts
export * as Either from 'effect/Either'
```

Added in v2.0.0

## From "effect/Encoding"

This module provides encoding & decoding functionality for:

- base64 (RFC4648)
- base64 (URL)
- hex

**Signature**

```ts
export * as Encoding from 'effect/Encoding'
```

Added in v2.0.0

## From "effect/Equal"

Re-exports all named exports from the "effect/Equal" module as "Equal".

**Signature**

```ts
export * as Equal from 'effect/Equal'
```

Added in v2.0.0

## From "effect/Equivalence"

This module provides an implementation of the `Equivalence` type class, which defines a binary relation
that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
These properties are also known in mathematics as an "equivalence relation".

**Signature**

```ts
export * as Equivalence from 'effect/Equivalence'
```

Added in v2.0.0

## From "effect/ExecutionStrategy"

Re-exports all named exports from the "effect/ExecutionStrategy" module as "ExecutionStrategy".

**Signature**

```ts
export * as ExecutionStrategy from 'effect/ExecutionStrategy'
```

Added in v2.0.0

## From "effect/Exit"

Re-exports all named exports from the "effect/Exit" module as "Exit".

**Signature**

```ts
export * as Exit from 'effect/Exit'
```

Added in v2.0.0

## From "effect/Fiber"

Re-exports all named exports from the "effect/Fiber" module as "Fiber".

**Signature**

```ts
export * as Fiber from 'effect/Fiber'
```

Added in v2.0.0

## From "effect/FiberId"

Re-exports all named exports from the "effect/FiberId" module as "FiberId".

**Signature**

```ts
export * as FiberId from 'effect/FiberId'
```

Added in v2.0.0

## From "effect/FiberRef"

Re-exports all named exports from the "effect/FiberRef" module as "FiberRef".

**Signature**

```ts
export * as FiberRef from 'effect/FiberRef'
```

Added in v2.0.0

## From "effect/FiberRefs"

Re-exports all named exports from the "effect/FiberRefs" module as "FiberRefs".

**Signature**

```ts
export * as FiberRefs from 'effect/FiberRefs'
```

Added in v2.0.0

## From "effect/FiberRefsPatch"

Re-exports all named exports from the "effect/FiberRefsPatch" module as "FiberRefsPatch".

**Signature**

```ts
export * as FiberRefsPatch from 'effect/FiberRefsPatch'
```

Added in v2.0.0

## From "effect/FiberStatus"

Re-exports all named exports from the "effect/FiberStatus" module as "FiberStatus".

**Signature**

```ts
export * as FiberStatus from 'effect/FiberStatus'
```

Added in v2.0.0

## From "effect/Function"

Re-exports all named exports from the "effect/Function" module as "Function".

**Signature**

```ts
export * as Function from 'effect/Function'
```

Added in v2.0.0

## From "effect/GlobalValue"

Re-exports all named exports from the "effect/GlobalValue" module as "GlobalValue".

**Signature**

```ts
export * as GlobalValue from 'effect/GlobalValue'
```

Added in v2.0.0

## From "effect/GroupBy"

Re-exports all named exports from the "effect/GroupBy" module as "GroupBy".

**Signature**

```ts
export * as GroupBy from 'effect/GroupBy'
```

Added in v2.0.0

## From "effect/HKT"

Re-exports all named exports from the "effect/HKT" module as "HKT".

**Signature**

```ts
export * as HKT from 'effect/HKT'
```

Added in v2.0.0

## From "effect/Hash"

Re-exports all named exports from the "effect/Hash" module as "Hash".

**Signature**

```ts
export * as Hash from 'effect/Hash'
```

Added in v2.0.0

## From "effect/HashMap"

Re-exports all named exports from the "effect/HashMap" module as "HashMap".

**Signature**

```ts
export * as HashMap from 'effect/HashMap'
```

Added in v2.0.0

## From "effect/HashSet"

Re-exports all named exports from the "effect/HashSet" module as "HashSet".

**Signature**

```ts
export * as HashSet from 'effect/HashSet'
```

Added in v2.0.0

## From "effect/Inspectable"

Re-exports all named exports from the "effect/Inspectable" module as "Inspectable".

**Signature**

```ts
export * as Inspectable from 'effect/Inspectable'
```

Added in v2.0.0

## From "effect/KeyedPool"

Re-exports all named exports from the "effect/KeyedPool" module as "KeyedPool".

**Signature**

```ts
export * as KeyedPool from 'effect/KeyedPool'
```

Added in v2.0.0

## From "effect/Layer"

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
export * as Layer from 'effect/Layer'
```

Added in v2.0.0

## From "effect/List"

A data type for immutable linked lists representing ordered collections of elements of type `A`.

This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.

**Performance**

- Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
- Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.

**Signature**

```ts
export * as List from 'effect/List'
```

Added in v2.0.0

## From "effect/LogLevel"

Re-exports all named exports from the "effect/LogLevel" module as "LogLevel".

**Signature**

```ts
export * as LogLevel from 'effect/LogLevel'
```

Added in v2.0.0

## From "effect/LogSpan"

Re-exports all named exports from the "effect/LogSpan" module as "LogSpan".

**Signature**

```ts
export * as LogSpan from 'effect/LogSpan'
```

Added in v2.0.0

## From "effect/Logger"

Re-exports all named exports from the "effect/Logger" module as "Logger".

**Signature**

```ts
export * as Logger from 'effect/Logger'
```

Added in v2.0.0

## From "effect/Metric"

Re-exports all named exports from the "effect/Metric" module as "Metric".

**Signature**

```ts
export * as Metric from 'effect/Metric'
```

Added in v2.0.0

## From "effect/MetricBoundaries"

Re-exports all named exports from the "effect/MetricBoundaries" module as "MetricBoundaries".

**Signature**

```ts
export * as MetricBoundaries from 'effect/MetricBoundaries'
```

Added in v2.0.0

## From "effect/MetricHook"

Re-exports all named exports from the "effect/MetricHook" module as "MetricHook".

**Signature**

```ts
export * as MetricHook from 'effect/MetricHook'
```

Added in v2.0.0

## From "effect/MetricKey"

Re-exports all named exports from the "effect/MetricKey" module as "MetricKey".

**Signature**

```ts
export * as MetricKey from 'effect/MetricKey'
```

Added in v2.0.0

## From "effect/MetricKeyType"

Re-exports all named exports from the "effect/MetricKeyType" module as "MetricKeyType".

**Signature**

```ts
export * as MetricKeyType from 'effect/MetricKeyType'
```

Added in v2.0.0

## From "effect/MetricLabel"

Re-exports all named exports from the "effect/MetricLabel" module as "MetricLabel".

**Signature**

```ts
export * as MetricLabel from 'effect/MetricLabel'
```

Added in v2.0.0

## From "effect/MetricPair"

Re-exports all named exports from the "effect/MetricPair" module as "MetricPair".

**Signature**

```ts
export * as MetricPair from 'effect/MetricPair'
```

Added in v2.0.0

## From "effect/MetricPolling"

Re-exports all named exports from the "effect/MetricPolling" module as "MetricPolling".

**Signature**

```ts
export * as MetricPolling from 'effect/MetricPolling'
```

Added in v2.0.0

## From "effect/MetricRegistry"

Re-exports all named exports from the "effect/MetricRegistry" module as "MetricRegistry".

**Signature**

```ts
export * as MetricRegistry from 'effect/MetricRegistry'
```

Added in v2.0.0

## From "effect/MetricState"

Re-exports all named exports from the "effect/MetricState" module as "MetricState".

**Signature**

```ts
export * as MetricState from 'effect/MetricState'
```

Added in v2.0.0

## From "effect/MutableHashMap"

Re-exports all named exports from the "effect/MutableHashMap" module as "MutableHashMap".

**Signature**

```ts
export * as MutableHashMap from 'effect/MutableHashMap'
```

Added in v2.0.0

## From "effect/MutableHashSet"

Re-exports all named exports from the "effect/MutableHashSet" module as "MutableHashSet".

**Signature**

```ts
export * as MutableHashSet from 'effect/MutableHashSet'
```

Added in v2.0.0

## From "effect/MutableList"

Re-exports all named exports from the "effect/MutableList" module as "MutableList".

**Signature**

```ts
export * as MutableList from 'effect/MutableList'
```

Added in v2.0.0

## From "effect/MutableQueue"

Re-exports all named exports from the "effect/MutableQueue" module as "MutableQueue".

**Signature**

```ts
export * as MutableQueue from 'effect/MutableQueue'
```

Added in v2.0.0

## From "effect/MutableRef"

Re-exports all named exports from the "effect/MutableRef" module as "MutableRef".

**Signature**

```ts
export * as MutableRef from 'effect/MutableRef'
```

Added in v2.0.0

## From "effect/NonEmptyIterable"

Re-exports all named exports from the "effect/NonEmptyIterable" module as "NonEmptyIterable".

**Signature**

```ts
export * as NonEmptyIterable from 'effect/NonEmptyIterable'
```

Added in v2.0.0

## From "effect/Number"

This module provides utility functions and type class instances for working with the `number` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as Number from 'effect/Number'
```

Added in v2.0.0

## From "effect/Option"

Re-exports all named exports from the "effect/Option" module as "Option".

**Signature**

```ts
export * as Option from 'effect/Option'
```

Added in v2.0.0

## From "effect/Order"

Re-exports all named exports from the "effect/Order" module as "Order".

**Signature**

```ts
export * as Order from 'effect/Order'
```

Added in v2.0.0

## From "effect/Ordering"

Re-exports all named exports from the "effect/Ordering" module as "Ordering".

**Signature**

```ts
export * as Ordering from 'effect/Ordering'
```

Added in v2.0.0

## From "effect/Pipeable"

Re-exports all named exports from the "effect/Pipeable" module as "Pipeable".

**Signature**

```ts
export * as Pipeable from 'effect/Pipeable'
```

Added in v2.0.0

## From "effect/Pool"

Re-exports all named exports from the "effect/Pool" module as "Pool".

**Signature**

```ts
export * as Pool from 'effect/Pool'
```

Added in v2.0.0

## From "effect/Predicate"

Re-exports all named exports from the "effect/Predicate" module as "Predicate".

**Signature**

```ts
export * as Predicate from 'effect/Predicate'
```

Added in v2.0.0

## From "effect/PubSub"

Re-exports all named exports from the "effect/PubSub" module as "PubSub".

**Signature**

```ts
export * as PubSub from 'effect/PubSub'
```

Added in v2.0.0

## From "effect/Queue"

Re-exports all named exports from the "effect/Queue" module as "Queue".

**Signature**

```ts
export * as Queue from 'effect/Queue'
```

Added in v2.0.0

## From "effect/Random"

Re-exports all named exports from the "effect/Random" module as "Random".

**Signature**

```ts
export * as Random from 'effect/Random'
```

Added in v2.0.0

## From "effect/ReadonlyArray"

This module provides utility functions for working with arrays in TypeScript.

**Signature**

```ts
export * as ReadonlyArray from 'effect/ReadonlyArray'
```

Added in v2.0.0

## From "effect/ReadonlyRecord"

This module provides utility functions for working with records in TypeScript.

**Signature**

```ts
export * as ReadonlyRecord from 'effect/ReadonlyRecord'
```

Added in v2.0.0

## From "effect/RedBlackTree"

Re-exports all named exports from the "effect/RedBlackTree" module as "RedBlackTree".

**Signature**

```ts
export * as RedBlackTree from 'effect/RedBlackTree'
```

Added in v2.0.0

## From "effect/Ref"

Re-exports all named exports from the "effect/Ref" module as "Ref".

**Signature**

```ts
export * as Ref from 'effect/Ref'
```

Added in v2.0.0

## From "effect/Reloadable"

Re-exports all named exports from the "effect/Reloadable" module as "Reloadable".

**Signature**

```ts
export * as Reloadable from 'effect/Reloadable'
```

Added in v2.0.0

## From "effect/Request"

Re-exports all named exports from the "effect/Request" module as "Request".

**Signature**

```ts
export * as Request from 'effect/Request'
```

Added in v2.0.0

## From "effect/RequestBlock"

Re-exports all named exports from the "effect/RequestBlock" module as "RequestBlock".

**Signature**

```ts
export * as RequestBlock from 'effect/RequestBlock'
```

Added in v2.0.0

## From "effect/RequestResolver"

Re-exports all named exports from the "effect/RequestResolver" module as "RequestResolver".

**Signature**

```ts
export * as RequestResolver from 'effect/RequestResolver'
```

Added in v2.0.0

## From "effect/Resource"

Re-exports all named exports from the "effect/Resource" module as "Resource".

**Signature**

```ts
export * as Resource from 'effect/Resource'
```

Added in v2.0.0

## From "effect/Runtime"

Re-exports all named exports from the "effect/Runtime" module as "Runtime".

**Signature**

```ts
export * as Runtime from 'effect/Runtime'
```

Added in v2.0.0

## From "effect/RuntimeFlags"

Re-exports all named exports from the "effect/RuntimeFlags" module as "RuntimeFlags".

**Signature**

```ts
export * as RuntimeFlags from 'effect/RuntimeFlags'
```

Added in v2.0.0

## From "effect/RuntimeFlagsPatch"

Re-exports all named exports from the "effect/RuntimeFlagsPatch" module as "RuntimeFlagsPatch".

**Signature**

```ts
export * as RuntimeFlagsPatch from 'effect/RuntimeFlagsPatch'
```

Added in v2.0.0

## From "effect/STM"

Re-exports all named exports from the "effect/STM" module as "STM".

**Signature**

```ts
export * as STM from 'effect/STM'
```

Added in v2.0.0

## From "effect/Schedule"

Re-exports all named exports from the "effect/Schedule" module as "Schedule".

**Signature**

```ts
export * as Schedule from 'effect/Schedule'
```

Added in v2.0.0

## From "effect/ScheduleDecision"

Re-exports all named exports from the "effect/ScheduleDecision" module as "ScheduleDecision".

**Signature**

```ts
export * as ScheduleDecision from 'effect/ScheduleDecision'
```

Added in v2.0.0

## From "effect/ScheduleInterval"

Re-exports all named exports from the "effect/ScheduleInterval" module as "ScheduleInterval".

**Signature**

```ts
export * as ScheduleInterval from 'effect/ScheduleInterval'
```

Added in v2.0.0

## From "effect/ScheduleIntervals"

Re-exports all named exports from the "effect/ScheduleIntervals" module as "ScheduleIntervals".

**Signature**

```ts
export * as ScheduleIntervals from 'effect/ScheduleIntervals'
```

Added in v2.0.0

## From "effect/Scheduler"

Re-exports all named exports from the "effect/Scheduler" module as "Scheduler".

**Signature**

```ts
export * as Scheduler from 'effect/Scheduler'
```

Added in v2.0.0

## From "effect/Scope"

Re-exports all named exports from the "effect/Scope" module as "Scope".

**Signature**

```ts
export * as Scope from 'effect/Scope'
```

Added in v2.0.0

## From "effect/ScopedCache"

Re-exports all named exports from the "effect/ScopedCache" module as "ScopedCache".

**Signature**

```ts
export * as ScopedCache from 'effect/ScopedCache'
```

Added in v2.0.0

## From "effect/ScopedRef"

Re-exports all named exports from the "effect/ScopedRef" module as "ScopedRef".

**Signature**

```ts
export * as ScopedRef from 'effect/ScopedRef'
```

Added in v2.0.0

## From "effect/Sink"

Re-exports all named exports from the "effect/Sink" module as "Sink".

**Signature**

```ts
export * as Sink from 'effect/Sink'
```

Added in v2.0.0

## From "effect/SortedMap"

Re-exports all named exports from the "effect/SortedMap" module as "SortedMap".

**Signature**

```ts
export * as SortedMap from 'effect/SortedMap'
```

Added in v2.0.0

## From "effect/SortedSet"

Re-exports all named exports from the "effect/SortedSet" module as "SortedSet".

**Signature**

```ts
export * as SortedSet from 'effect/SortedSet'
```

Added in v2.0.0

## From "effect/Stream"

Re-exports all named exports from the "effect/Stream" module as "Stream".

**Signature**

```ts
export * as Stream from 'effect/Stream'
```

Added in v2.0.0

## From "effect/StreamEmit"

Re-exports all named exports from the "effect/StreamEmit" module as "StreamEmit".

**Signature**

```ts
export * as StreamEmit from 'effect/StreamEmit'
```

Added in v2.0.0

## From "effect/StreamHaltStrategy"

Re-exports all named exports from the "effect/StreamHaltStrategy" module as "StreamHaltStrategy".

**Signature**

```ts
export * as StreamHaltStrategy from 'effect/StreamHaltStrategy'
```

Added in v2.0.0

## From "effect/Streamable"

Re-exports all named exports from the "effect/Streamable" module as "Streamable".

**Signature**

```ts
export * as Streamable from 'effect/Streamable'
```

Added in v2.0.0

## From "effect/String"

This module provides utility functions and type class instances for working with the `string` type in TypeScript.
It includes functions for basic string manipulation, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

**Signature**

```ts
export * as String from 'effect/String'
```

Added in v2.0.0

## From "effect/Struct"

This module provides utility functions for working with structs in TypeScript.

**Signature**

```ts
export * as Struct from 'effect/Struct'
```

Added in v2.0.0

## From "effect/SubscriptionRef"

Re-exports all named exports from the "effect/SubscriptionRef" module as "SubscriptionRef".

**Signature**

```ts
export * as SubscriptionRef from 'effect/SubscriptionRef'
```

Added in v2.0.0

## From "effect/Supervisor"

A `Supervisor<T>` is allowed to supervise the launching and termination of
fibers, producing some visible value of type `T` from the supervision.

**Signature**

```ts
export * as Supervisor from 'effect/Supervisor'
```

Added in v2.0.0

## From "effect/Symbol"

Re-exports all named exports from the "effect/Symbol" module as "Symbol".

**Signature**

```ts
export * as Symbol from 'effect/Symbol'
```

Added in v2.0.0

## From "effect/SynchronizedRef"

Re-exports all named exports from the "effect/SynchronizedRef" module as "SynchronizedRef".

**Signature**

```ts
export * as SynchronizedRef from 'effect/SynchronizedRef'
```

Added in v2.0.0

## From "effect/TArray"

Re-exports all named exports from the "effect/TArray" module as "TArray".

**Signature**

```ts
export * as TArray from 'effect/TArray'
```

Added in v2.0.0

## From "effect/TDeferred"

Re-exports all named exports from the "effect/TDeferred" module as "TDeferred".

**Signature**

```ts
export * as TDeferred from 'effect/TDeferred'
```

Added in v2.0.0

## From "effect/TMap"

Re-exports all named exports from the "effect/TMap" module as "TMap".

**Signature**

```ts
export * as TMap from 'effect/TMap'
```

Added in v2.0.0

## From "effect/TPriorityQueue"

Re-exports all named exports from the "effect/TPriorityQueue" module as "TPriorityQueue".

**Signature**

```ts
export * as TPriorityQueue from 'effect/TPriorityQueue'
```

Added in v2.0.0

## From "effect/TPubSub"

Re-exports all named exports from the "effect/TPubSub" module as "TPubSub".

**Signature**

```ts
export * as TPubSub from 'effect/TPubSub'
```

Added in v2.0.0

## From "effect/TQueue"

Re-exports all named exports from the "effect/TQueue" module as "TQueue".

**Signature**

```ts
export * as TQueue from 'effect/TQueue'
```

Added in v2.0.0

## From "effect/TRandom"

Re-exports all named exports from the "effect/TRandom" module as "TRandom".

**Signature**

```ts
export * as TRandom from 'effect/TRandom'
```

Added in v2.0.0

## From "effect/TReentrantLock"

Re-exports all named exports from the "effect/TReentrantLock" module as "TReentrantLock".

**Signature**

```ts
export * as TReentrantLock from 'effect/TReentrantLock'
```

Added in v2.0.0

## From "effect/TRef"

Re-exports all named exports from the "effect/TRef" module as "TRef".

**Signature**

```ts
export * as TRef from 'effect/TRef'
```

Added in v2.0.0

## From "effect/TSemaphore"

Re-exports all named exports from the "effect/TSemaphore" module as "TSemaphore".

**Signature**

```ts
export * as TSemaphore from 'effect/TSemaphore'
```

Added in v2.0.0

## From "effect/TSet"

Re-exports all named exports from the "effect/TSet" module as "TSet".

**Signature**

```ts
export * as TSet from 'effect/TSet'
```

Added in v2.0.0

## From "effect/Take"

Re-exports all named exports from the "effect/Take" module as "Take".

**Signature**

```ts
export * as Take from 'effect/Take'
```

Added in v2.0.0

## From "effect/TestAnnotation"

Re-exports all named exports from the "effect/TestAnnotation" module as "TestAnnotation".

**Signature**

```ts
export * as TestAnnotation from 'effect/TestAnnotation'
```

Added in v2.0.0

## From "effect/TestAnnotationMap"

Re-exports all named exports from the "effect/TestAnnotationMap" module as "TestAnnotationMap".

**Signature**

```ts
export * as TestAnnotationMap from 'effect/TestAnnotationMap'
```

Added in v2.0.0

## From "effect/TestAnnotations"

Re-exports all named exports from the "effect/TestAnnotations" module as "TestAnnotations".

**Signature**

```ts
export * as TestAnnotations from 'effect/TestAnnotations'
```

Added in v2.0.0

## From "effect/TestClock"

Re-exports all named exports from the "effect/TestClock" module as "TestClock".

**Signature**

```ts
export * as TestClock from 'effect/TestClock'
```

Added in v2.0.0

## From "effect/TestConfig"

Re-exports all named exports from the "effect/TestConfig" module as "TestConfig".

**Signature**

```ts
export * as TestConfig from 'effect/TestConfig'
```

Added in v2.0.0

## From "effect/TestContext"

Re-exports all named exports from the "effect/TestContext" module as "TestContext".

**Signature**

```ts
export * as TestContext from 'effect/TestContext'
```

Added in v2.0.0

## From "effect/TestLive"

Re-exports all named exports from the "effect/TestLive" module as "TestLive".

**Signature**

```ts
export * as TestLive from 'effect/TestLive'
```

Added in v2.0.0

## From "effect/TestServices"

Re-exports all named exports from the "effect/TestServices" module as "TestServices".

**Signature**

```ts
export * as TestServices from 'effect/TestServices'
```

Added in v2.0.0

## From "effect/TestSized"

Re-exports all named exports from the "effect/TestSized" module as "TestSized".

**Signature**

```ts
export * as TestSized from 'effect/TestSized'
```

Added in v2.0.0

## From "effect/Tracer"

Re-exports all named exports from the "effect/Tracer" module as "Tracer".

**Signature**

```ts
export * as Tracer from 'effect/Tracer'
```

Added in v2.0.0

## From "effect/Tuple"

This module provides utility functions for working with tuples in TypeScript.

**Signature**

```ts
export * as Tuple from 'effect/Tuple'
```

Added in v2.0.0

## From "effect/Types"

A collection of types that are commonly used types.

**Signature**

```ts
export * as Types from 'effect/Types'
```

Added in v2.0.0

## From "effect/Unify"

Re-exports all named exports from the "effect/Unify" module as "Unify".

**Signature**

```ts
export * as Unify from 'effect/Unify'
```

Added in v2.0.0

## From "effect/Utils"

Re-exports all named exports from the "effect/Utils" module as "Utils".

**Signature**

```ts
export * as Utils from 'effect/Utils'
```

Added in v2.0.0

# utils

## absurd

**Signature**

```ts
export declare const absurd: any
```

Added in v2.0.0

## flow

**Signature**

```ts
export declare const flow: any
```

Added in v2.0.0

## hole

**Signature**

```ts
export declare const hole: any
```

Added in v2.0.0

## identity

**Signature**

```ts
export declare const identity: any
```

Added in v2.0.0

## pipe

**Signature**

```ts
export declare const pipe: any
```

Added in v2.0.0

## unsafeCoerce

**Signature**

```ts
export declare const unsafeCoerce: any
```

Added in v2.0.0
