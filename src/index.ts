/**
 * @since 2.0.0
 */

import * as Bigint from "effect/Bigint"
import * as Boolean from "effect/Boolean"
import * as Brand from "effect/Brand"
import * as Cache from "effect/Cache"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as ChannelChildExecutorDecision from "effect/ChannelChildExecutorDecision"
import * as ChannelMergeDecision from "effect/ChannelMergeDecision"
import * as ChannelMergeState from "effect/ChannelMergeState"
import * as ChannelMergeStrategy from "effect/ChannelMergeStrategy"
import * as ChannelSingleProducerAsyncInput from "effect/ChannelSingleProducerAsyncInput"
import * as ChannelUpstreamPullRequest from "effect/ChannelUpstreamPullRequest"
import * as ChannelUpstreamPullStrategy from "effect/ChannelUpstreamPullStrategy"
import * as Chunk from "effect/Chunk"
import * as Clock from "effect/Clock"
import * as Concurrency from "effect/Concurrency"
import * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as ConfigSecret from "effect/ConfigSecret"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as DefaultServices from "effect/DefaultServices"
import * as Deferred from "effect/Deferred"
import * as Differ from "effect/Differ"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import * as FiberStatus from "effect/FiberStatus"
import { absurd, flow, hole, identity, pipe, unsafeCoerce } from "effect/Function"
import * as Function from "effect/Function"
import * as GlobalValue from "effect/GlobalValue"
import * as GroupBy from "effect/GroupBy"
import * as Hash from "effect/Hash"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as HKT from "effect/HKT"
import * as Hub from "effect/Hub"
import * as KeyedPool from "effect/KeyedPool"
import * as Layer from "effect/Layer"
import * as List from "effect/List"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as LogSpan from "effect/LogSpan"
import * as Match from "effect/Match"
import * as Metric from "effect/Metric"
import * as MetricBoundaries from "effect/MetricBoundaries"
import * as MetricHook from "effect/MetricHook"
import * as MetricKey from "effect/MetricKey"
import * as MetricKeyType from "effect/MetricKeyType"
import * as MetricLabel from "effect/MetricLabel"
import * as MetricPair from "effect/MetricPair"
import * as MetricPolling from "effect/MetricPolling"
import * as MetricRegistry from "effect/MetricRegistry"
import * as MetricState from "effect/MetricState"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as MutableList from "effect/MutableList"
import * as MutableQueue from "effect/MutableQueue"
import * as MutableRef from "effect/MutableRef"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Ordering from "effect/Ordering"
import * as PCGRandom from "effect/PCGRandom"
import * as Pipeable from "effect/Pipeable"
import * as Pool from "effect/Pool"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import * as Random from "effect/Random"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import * as RedBlackTree from "effect/RedBlackTree"
import * as Ref from "effect/Ref"
import * as Reloadable from "effect/Reloadable"
import * as Request from "effect/Request"
import * as RequestBlock from "effect/RequestBlock"
import * as RequestResolver from "effect/RequestResolver"
import * as Resource from "effect/Resource"
import * as Runtime from "effect/Runtime"
import * as RuntimeFlags from "effect/RuntimeFlags"
import * as RuntimeFlagsPatch from "effect/RuntimeFlagsPatch"
import * as Schedule from "effect/Schedule"
import * as ScheduleDecision from "effect/ScheduleDecision"
import * as ScheduleInterval from "effect/ScheduleInterval"
import * as ScheduleIntervals from "effect/ScheduleIntervals"
import * as Scheduler from "effect/Scheduler"
import * as Scope from "effect/Scope"
import * as ScopedCache from "effect/ScopedCache"
import * as ScopedRef from "effect/ScopedRef"
import * as Sink from "effect/Sink"
import * as SortedMap from "effect/SortedMap"
import * as SortedSet from "effect/SortedSet"
import * as STM from "effect/STM"
import * as Stream from "effect/Stream"
import * as StreamEmit from "effect/StreamEmit"
import * as StreamHaltStrategy from "effect/StreamHaltStrategy"
import * as String from "effect/String"
import * as Struct from "effect/Struct"
import * as SubscriptionRef from "effect/SubscriptionRef"
import * as Supervisor from "effect/Supervisor"
import * as Symbol from "effect/Symbol"
import * as SynchronizedRef from "effect/SynchronizedRef"
import * as Take from "effect/Take"
import * as TArray from "effect/TArray"
import * as TDeferred from "effect/TDeferred"
import * as THub from "effect/THub"
import * as TMap from "effect/TMap"
import * as TPriorityQueue from "effect/TPriorityQueue"
import * as TQueue from "effect/TQueue"
import * as Tracer from "effect/Tracer"
import * as TRandom from "effect/TRandom"
import * as TReentrantLock from "effect/TReentrantLock"
import * as TRef from "effect/TRef"
import * as TSemaphore from "effect/TSemaphore"
import * as TSet from "effect/TSet"
import * as Tuple from "effect/Tuple"
import * as Types from "effect/Types"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd
   * - Module: "effect/Function"
   * ```
   */
  absurd,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html
   * - Module: "effect/Bigint"
   * ```
   */
  Bigint,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html
   * - Module: "effect/Boolean"
   * ```
   */
  Boolean,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Brand.ts.html
   * - Module: "effect/Brand"
   * ```
   */
  Brand,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cache.ts.html
   * - Module: "effect/Cache"
   * ```
   */
  Cache,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
   * - Module: "effect/Cause"
   * ```
   */
  Cause,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html
   * - Module: "@effect/stream/Channel"
   * ```
   */
  Channel,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html
   * - Module: "@effect/stream/Channel/ChildExecutorDecision"
   * ```
   */
  ChannelChildExecutorDecision,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html
   * - Module: "@effect/stream/Channel/MergeDecision"
   * ```
   */
  ChannelMergeDecision,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html
   * - Module: "@effect/stream/Channel/MergeState"
   * ```
   */
  ChannelMergeState,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html
   * - Module: "@effect/stream/Channel/MergeStrategy"
   * ```
   */
  ChannelMergeStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html
   * - Module: "@effect/stream/Channel/SingleProducerAsyncInput"
   * ```
   */
  ChannelSingleProducerAsyncInput,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html
   * - Module: "@effect/stream/Channel/UpstreamPullRequest"
   * ```
   */
  ChannelUpstreamPullRequest,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html
   * - Module: "@effect/stream/Channel/UpstreamPullStrategy"
   * ```
   */
  ChannelUpstreamPullStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html
   * - Module: "effect/Chunk"
   * ```
   */
  Chunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
   * - Module: "effect/Clock"
   * ```
   */
  Clock,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html
   * - Module: "effect/Concurrency"
   * ```
   */
  Concurrency,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Config.ts.html
   * - Module: "effect/Config"
   * ```
   */
  Config,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html
   * - Module: "effect/ConfigError"
   * ```
   */
  ConfigError,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html
   * - Module: "effect/ConfigProvider"
   * ```
   */
  ConfigProvider,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html
   * - Module: "effect/ConfigSecret"
   * ```
   */
  ConfigSecret,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Console.ts.html
   * - Module: "effect/Console"
   * ```
   */
  Console,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Context.ts.html
   * - Module: "effect/Context"
   * ```
   */
  Context,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Data.ts.html
   * - Module: "effect/Data"
   * ```
   */
  Data,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
   * - Module: "effect/DefaultServices"
   * ```
   */
  DefaultServices,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
   * - Module: "effect/Deferred"
   * ```
   */
  Deferred,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Differ.ts.html
   * - Module: "effect/Differ"
   * ```
   */
  Differ,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Duration.ts.html
   * - Module: "effect/Duration"
   * ```
   */
  Duration,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
   * - Module: "effect/Effect"
   * ```
   */
  Effect,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Either.ts.html
   * - Module: "effect/Either"
   * ```
   */
  Either,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Equal.ts.html
   * - Module: "effect/Equal"
   * ```
   */
  Equal,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html
   * - Module: "effect/Equivalence"
   * ```
   */
  Equivalence,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
   * - Module: "effect/ExecutionStrategy"
   * ```
   */
  ExecutionStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
   * - Module: "effect/Exit"
   * ```
   */
  Exit,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
   * - Module: "effect/Fiber"
   * ```
   */
  Fiber,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html
   * - Module: "effect/FiberId"
   * ```
   */
  FiberId,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
   * - Module: "effect/FiberRef"
   * ```
   */
  FiberRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
   * - Module: "effect/FiberRefs"
   * ```
   */
  FiberRefs,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html
   * - Module: "effect/FiberStatus"
   * ```
   */
  FiberStatus,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow
   * - Module: "effect/Function"
   * ```
   */
  flow,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html
   * - Module: "effect/Function"
   * ```
   */
  Function,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html
   * - Module: "effect/GlobalValue"
   * ```
   */
  GlobalValue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html
   * - Module: "@effect/stream/GroupBy"
   * ```
   */
  GroupBy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Hash.ts.html
   * - Module: "effect/Hash"
   * ```
   */
  Hash,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html
   * - Module: "effect/HashMap"
   * ```
   */
  HashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html
   * - Module: "effect/HashSet"
   * ```
   */
  HashSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
   * - Module: "effect/HKT"
   * ```
   */
  HKT,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole
   * - Module: "effect/Function"
   * ```
   */
  hole,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
   * - Module: "effect/Hub"
   * ```
   */
  Hub,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity
   * - Module: "effect/Function"
   * ```
   */
  identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html
   * - Module: "effect/KeyedPool"
   * ```
   */
  KeyedPool,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
   * - Module: "effect/Layer"
   * ```
   */
  Layer,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/List.ts.html
   * - Module: "effect/List"
   * ```
   */
  List,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
   * - Module: "effect/Logger"
   * ```
   */
  Logger,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html
   * - Module: "effect/LogLevel"
   * ```
   */
  LogLevel,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html
   * - Module: "effect/LoggerSpan"
   * ```
   */
  LogSpan,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/match/modules/index.ts.html
   * - Module: "@effect/match"
   * ```
   */
  Match,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
   * - Module: "effect/Metric"
   * ```
   */
  Metric,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html
   * - Module: "effect/MetricBoundaries"
   * ```
   */
  MetricBoundaries,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html
   * - Module: "effect/MetricHook"
   * ```
   */
  MetricHook,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html
   * - Module: "effect/MetricKey"
   * ```
   */
  MetricKey,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html
   * - Module: "effect/MetricKeyType"
   * ```
   */
  MetricKeyType,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html
   * - Module: "effect/MetricLabel"
   * ```
   */
  MetricLabel,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html
   * - Module: "effect/MetricPair"
   * ```
   */
  MetricPair,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html
   * - Module: "effect/MetricPolling"
   * ```
   */
  MetricPolling,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html
   * - Module: "effect/MetricRegistry"
   * ```
   */
  MetricRegistry,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html
   * - Module: "effect/MetricState"
   * ```
   */
  MetricState,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html
   * - Module: "effect/MutableHashMap"
   * ```
   */
  MutableHashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html
   * - Module: "effect/MutableHashSet"
   * ```
   */
  MutableHashSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html
   * - Module: "effect/MutableList"
   * ```
   */
  MutableList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html
   * - Module: "effect/MutableQueue"
   * ```
   */
  MutableQueue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html
   * - Module: "effect/mutable/MutableRef"
   * ```
   */
  MutableRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Number.ts.html
   * - Module: "effect/Number"
   * ```
   */
  Number,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Option.ts.html
   * - Module: "effect/Option"
   * ```
   */
  Option,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Order.ts.html
   * - Module: "effect/Order"
   * ```
   */
  Order,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html
   * - Module: "effect/Ordering"
   * ```
   */
  Ordering,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html
   * - Module: "effect/PCGRandom"
   * ```
   */
  PCGRandom,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe
   * - Module: "effect/Function"
   * ```
   */
  pipe,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html
   * - Module: "effect/Pipeable"
   * ```
   */
  Pipeable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Pool.ts.html
   * - Module: "effect/Pool"
   * ```
   */
  Pool,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html
   * - Module: "effect/Predicate"
   * ```
   */
  Predicate,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
   * - Module: "effect/Queue"
   * ```
   */
  Queue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Random.ts.html
   * - Module: "effect/Random"
   * ```
   */
  Random,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html
   * - Module: "effect/ReadonlyArray"
   * ```
   */
  ReadonlyArray,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html
   * - Module: "effect/ReadonlyRecord"
   * ```
   */
  ReadonlyRecord,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html
   * - Module: "effect/RedBlackTree"
   * ```
   */
  RedBlackTree,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
   * - Module: "effect/Ref"
   * ```
   */
  Ref,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
   * - Module: "effect/Reloadable"
   * ```
   */
  Reloadable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Request.ts.html
   * - Module: "effect/Request"
   * ```
   */
  Request,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html
   * - Module: "effect/RequestBlock"
   * ```
   */
  RequestBlock,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html
   * - Module: "effect/RequestResolver"
   * ```
   */
  RequestResolver,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Resource.ts.html
   * - Module: "effect/Resource"
   * ```
   */
  Resource,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
   * - Module: "effect/Runtime"
   * ```
   */
  Runtime,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html
   * - Module: "effect/RuntimeFlags"
   * ```
   */
  RuntimeFlags,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html
   * - Module: "effect/RuntimeFlagsPatch"
   * ```
   */
  RuntimeFlagsPatch,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
   * - Module: "effect/Schedule"
   * ```
   */
  Schedule,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html
   * - Module: "effect/ScheduleDecision"
   * ```
   */
  ScheduleDecision,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html
   * - Module: "effect/ScheduleInterval"
   * ```
   */
  ScheduleInterval,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html
   * - Module: "effect/ScheduleIntervals"
   * ```
   */
  ScheduleIntervals,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html
   * - Module: "effect/Scheduler"
   * ```
   */
  Scheduler,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
   * - Module: "effect/Scope"
   * ```
   */
  Scope,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html
   * - Module: "effect/ScopedCache"
   * ```
   */
  ScopedCache,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html
   * - Module: "effect/ScopedRef"
   * ```
   */
  ScopedRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html
   * - Module: "@effect/stream/Sink"
   * ```
   */
  Sink,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html
   * - Module: "effect/SortedMap"
   * ```
   */
  SortedMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html
   * - Module: "effect/SortedSet"
   * ```
   */
  SortedSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/STM.ts.html
   * - Module: "@effect/stm/STM"
   * ```
   */
  STM,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html
   * - Module: "@effect/stream/Stream"
   * ```
   */
  Stream,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html
   * - Module: "@effect/stream/Stream/Emit"
   * ```
   */
  StreamEmit,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html
   * - Module: "@effect/stream/Stream/HaltStrategy"
   * ```
   */
  StreamHaltStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/String.ts.html
   * - Module: "effect/String"
   * ```
   */
  String,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Struct.ts.html
   * - Module: "effect/Struct"
   * ```
   */
  Struct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html
   * - Module: "@effect/stream/SubscriptionRef"
   * ```
   */
  SubscriptionRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
   * - Module: "effect/Supervisor"
   * ```
   */
  Supervisor,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html
   * - Module: "effect/Symbol"
   * ```
   */
  Symbol,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html
   * - Module: "effect/SynchronizedRef"
   * ```
   */
  SynchronizedRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stream/modules/Take.ts.html
   * - Module: "@effect/stream/Take"
   * ```
   */
  Take,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html
   * - Module: "@effect/stm/TArray"
   * ```
   */
  TArray,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html
   * - Module: "@effect/stm/TDeferred"
   * ```
   */
  TDeferred,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/THub.ts.html
   * - Module: "@effect/stm/THub"
   * ```
   */
  THub,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html
   * - Module: "@effect/stm/TMap"
   * ```
   */
  TMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html
   * - Module: "@effect/stm/TPriorityQueue"
   * ```
   */
  TPriorityQueue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html
   * - Module: "@effect/stm/TQueue"
   * ```
   */
  TQueue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
   * - Module: "effect/Tracer"
   * ```
   */
  Tracer,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html
   * - Module: "@effect/stm/TRandom"
   * ```
   */
  TRandom,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html
   * - Module: "@effect/stm/TReentrantLock"
   * ```
   */
  TReentrantLock,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html
   * - Module: "@effect/stm/TRef"
   * ```
   */
  TRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html
   * - Module: "@effect/stm/TSemaphore"
   * ```
   */
  TSemaphore,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html
   * - Module: "@effect/stm/TSet"
   * ```
   */
  TSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html
   * - Module: "effect/Tuple"
   * ```
   */
  Tuple,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/data/modules/Types.ts.html
   * - Module: "effect/Types"
   * ```
   */
  Types,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
}
