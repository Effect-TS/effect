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
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd
   */
  absurd,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Bigint`
   * - Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html
   */
  Bigint,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Boolean`
   * - Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html
   */
  Boolean,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Brand`
   * - Docs: https://effect-ts.github.io/data/modules/Brand.ts.html
   */
  Brand,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Cache`
   * - Docs: https://effect-ts.github.io/io/modules/Cache.ts.html
   */
  Cache,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Cause`
   * - Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
   */
  Cause,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html
   */
  Channel,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/ChildExecutorDecision`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html
   */
  ChannelChildExecutorDecision,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/MergeDecision`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html
   */
  ChannelMergeDecision,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/MergeState`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html
   */
  ChannelMergeState,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/MergeStrategy`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html
   */
  ChannelMergeStrategy,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/SingleProducerAsyncInput`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html
   */
  ChannelSingleProducerAsyncInput,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/UpstreamPullRequest`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html
   */
  ChannelUpstreamPullRequest,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Channel/UpstreamPullStrategy`
   * - Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html
   */
  ChannelUpstreamPullStrategy,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Chunk`
   * - Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html
   */
  Chunk,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Clock`
   * - Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
   */
  Clock,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Concurrency`
   * - Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html
   */
  Concurrency,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Config`
   * - Docs: https://effect-ts.github.io/io/modules/Config.ts.html
   */
  Config,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ConfigError`
   * - Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html
   */
  ConfigError,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ConfigProvider`
   * - Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html
   */
  ConfigProvider,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ConfigSecret`
   * - Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html
   */
  ConfigSecret,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Console`
   * - Docs: https://effect-ts.github.io/data/modules/Console.ts.html
   */
  Console,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Context`
   * - Docs: https://effect-ts.github.io/data/modules/Context.ts.html
   */
  Context,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Data`
   * - Docs: https://effect-ts.github.io/data/modules/Data.ts.html
   */
  Data,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/DefaultServices`
   * - Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
   */
  DefaultServices,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Deferred`
   * - Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
   */
  Deferred,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Differ`
   * - Docs: https://effect-ts.github.io/data/modules/Differ.ts.html
   */
  Differ,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Duration`
   * - Docs: https://effect-ts.github.io/data/modules/Duration.ts.html
   */
  Duration,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Effect`
   * - Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
   */
  Effect,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Either`
   * - Docs: https://effect-ts.github.io/data/modules/Either.ts.html
   */
  Either,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Equal`
   * - Docs: https://effect-ts.github.io/data/modules/Equal.ts.html
   */
  Equal,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Equivalence`
   * - Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html
   */
  Equivalence,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ExecutionStrategy`
   * - Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
   */
  ExecutionStrategy,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Exit`
   * - Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
   */
  Exit,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Fiber`
   * - Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
   */
  Fiber,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/FiberId`
   * - Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html
   */
  FiberId,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/FiberRef`
   * - Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
   */
  FiberRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/FiberRefs`
   * - Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
   */
  FiberRefs,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/FiberStatus`
   * - Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html
   */
  FiberStatus,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow
   */
  flow,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html
   */
  Function,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/GlobalValue`
   * - Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html
   */
  GlobalValue,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/GroupBy`
   * - Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html
   */
  GroupBy,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Hash`
   * - Docs: https://effect-ts.github.io/data/modules/Hash.ts.html
   */
  Hash,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/HashMap`
   * - Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html
   */
  HashMap,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/HashSet`
   * - Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html
   */
  HashSet,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/HKT`
   * - Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
   */
  HKT,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole
   */
  hole,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Hub`
   * - Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
   */
  Hub,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity
   */
  identity,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/KeyedPool`
   * - Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html
   */
  KeyedPool,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Layer`
   * - Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
   */
  Layer,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/List`
   * - Docs: https://effect-ts.github.io/data/modules/List.ts.html
   */
  List,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Logger`
   * - Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
   */
  Logger,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/LogLevel`
   * - Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html
   */
  LogLevel,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/LoggerSpan`
   * - Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html
   */
  LogSpan,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/match`
   * - Docs: https://effect-ts.github.io/match/modules/index.ts.html
   */
  Match,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Metric`
   * - Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
   */
  Metric,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricBoundaries`
   * - Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html
   */
  MetricBoundaries,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricHook`
   * - Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html
   */
  MetricHook,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricKey`
   * - Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html
   */
  MetricKey,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricKeyType`
   * - Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html
   */
  MetricKeyType,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricLabel`
   * - Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html
   */
  MetricLabel,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricPair`
   * - Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html
   */
  MetricPair,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricPolling`
   * - Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html
   */
  MetricPolling,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricRegistry`
   * - Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html
   */
  MetricRegistry,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/MetricState`
   * - Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html
   */
  MetricState,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/MutableHashMap`
   * - Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html
   */
  MutableHashMap,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/MutableHashSet`
   * - Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html
   */
  MutableHashSet,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/MutableList`
   * - Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html
   */
  MutableList,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/MutableQueue`
   * - Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html
   */
  MutableQueue,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/mutable/MutableRef`
   * - Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html
   */
  MutableRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Number`
   * - Docs: https://effect-ts.github.io/data/modules/Number.ts.html
   */
  Number,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Option`
   * - Docs: https://effect-ts.github.io/data/modules/Option.ts.html
   */
  Option,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Order`
   * - Docs: https://effect-ts.github.io/data/modules/Order.ts.html
   */
  Order,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Ordering`
   * - Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html
   */
  Ordering,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/PCGRandom`
   * - Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html
   */
  PCGRandom,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe
   */
  pipe,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Pipeable`
   * - Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html
   */
  Pipeable,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Pool`
   * - Docs: https://effect-ts.github.io/io/modules/Pool.ts.html
   */
  Pool,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Predicate`
   * - Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html
   */
  Predicate,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Queue`
   * - Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
   */
  Queue,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Random`
   * - Docs: https://effect-ts.github.io/io/modules/Random.ts.html
   */
  Random,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/ReadonlyArray`
   * - Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html
   */
  ReadonlyArray,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/ReadonlyRecord`
   * - Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html
   */
  ReadonlyRecord,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/RedBlackTree`
   * - Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html
   */
  RedBlackTree,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Ref`
   * - Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
   */
  Ref,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Reloadable`
   * - Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
   */
  Reloadable,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Request`
   * - Docs: https://effect-ts.github.io/io/modules/Request.ts.html
   */
  Request,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/RequestBlock`
   * - Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html
   */
  RequestBlock,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/RequestResolver`
   * - Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html
   */
  RequestResolver,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Resource`
   * - Docs: https://effect-ts.github.io/io/modules/Resource.ts.html
   */
  Resource,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Runtime`
   * - Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
   */
  Runtime,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/RuntimeFlags`
   * - Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html
   */
  RuntimeFlags,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/RuntimeFlagsPatch`
   * - Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html
   */
  RuntimeFlagsPatch,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Schedule`
   * - Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
   */
  Schedule,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ScheduleDecision`
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html
   */
  ScheduleDecision,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ScheduleInterval`
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html
   */
  ScheduleInterval,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ScheduleIntervals`
   * - Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html
   */
  ScheduleIntervals,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Scheduler`
   * - Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html
   */
  Scheduler,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Scope`
   * - Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
   */
  Scope,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ScopedCache`
   * - Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html
   */
  ScopedCache,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/ScopedRef`
   * - Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html
   */
  ScopedRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Sink`
   * - Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html
   */
  Sink,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/SortedMap`
   * - Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html
   */
  SortedMap,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/SortedSet`
   * - Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html
   */
  SortedSet,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/STM`
   * - Docs: https://effect-ts.github.io/stm/modules/STM.ts.html
   */
  STM,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Stream`
   * - Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html
   */
  Stream,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Stream/Emit`
   * - Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html
   */
  StreamEmit,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Stream/HaltStrategy`
   * - Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html
   */
  StreamHaltStrategy,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/String`
   * - Docs: https://effect-ts.github.io/data/modules/String.ts.html
   */
  String,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Struct`
   * - Docs: https://effect-ts.github.io/data/modules/Struct.ts.html
   */
  Struct,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/SubscriptionRef`
   * - Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html
   */
  SubscriptionRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Supervisor`
   * - Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
   */
  Supervisor,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Symbol`
   * - Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html
   */
  Symbol,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/SynchronizedRef`
   * - Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html
   */
  SynchronizedRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stream/Take`
   * - Docs: https://effect-ts.github.io/stream/modules/Take.ts.html
   */
  Take,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TArray`
   * - Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html
   */
  TArray,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TDeferred`
   * - Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html
   */
  TDeferred,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/THub`
   * - Docs: https://effect-ts.github.io/stm/modules/THub.ts.html
   */
  THub,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TMap`
   * - Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html
   */
  TMap,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TPriorityQueue`
   * - Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html
   */
  TPriorityQueue,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TQueue`
   * - Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html
   */
  TQueue,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/io/Tracer`
   * - Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
   */
  Tracer,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TRandom`
   * - Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html
   */
  TRandom,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TReentrantLock`
   * - Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html
   */
  TReentrantLock,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TRef`
   * - Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html
   */
  TRef,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TSemaphore`
   * - Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html
   */
  TSemaphore,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/stm/TSet`
   * - Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html
   */
  TSet,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Tuple`
   * - Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html
   */
  Tuple,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Types`
   * - Docs: https://effect-ts.github.io/data/modules/Types.ts.html
   */
  Types,
  /**
   * @since 2.0.0
   *
   * - Module: `@effect/data/Function`
   * - Docs: https://effect-ts.github.io/data/modules/Function.ts.html#unsafecoerce
   */
  unsafeCoerce
}
