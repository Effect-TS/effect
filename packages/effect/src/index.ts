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
import * as FiberRefsPatch from "effect/FiberRefsPatch"
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
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#absurd
   *
   * @since 2.0.0
   */
  absurd,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Bigint.ts.html
   *
   * @since 2.0.0
   */
  Bigint,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Boolean.ts.html
   *
   * @since 2.0.0
   */
  Boolean,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Brand.ts.html
   *
   * @since 2.0.0
   */
  Brand,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Cache.ts.html
   *
   * @since 2.0.0
   */
  Cache,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
   *
   * @since 2.0.0
   */
  Cause,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel.ts.html
   *
   * @since 2.0.0
   */
  Channel,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/ChildExecutorDecision.ts.html
   *
   * @since 2.0.0
   */
  ChannelChildExecutorDecision,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/MergeDecision.ts.html
   *
   * @since 2.0.0
   */
  ChannelMergeDecision,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/MergeState.ts.html
   *
   * @since 2.0.0
   */
  ChannelMergeState,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/MergeStrategy.ts.html
   *
   * @since 2.0.0
   */
  ChannelMergeStrategy,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/SingleProducerAsyncInput.ts.html
   *
   * @since 2.0.0
   */
  ChannelSingleProducerAsyncInput,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullRequest.ts.html
   *
   * @since 2.0.0
   */
  ChannelUpstreamPullRequest,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Channel/UpstreamPullStrategy.ts.html
   *
   * @since 2.0.0
   */
  ChannelUpstreamPullStrategy,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Chunk.ts.html
   *
   * @since 2.0.0
   */
  Chunk,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
   *
   * @since 2.0.0
   */
  Clock,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Concurrency.ts.html
   *
   * @since 2.0.0
   */
  Concurrency,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Config.ts.html
   *
   * @since 2.0.0
   */
  Config,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ConfigError.ts.html
   *
   * @since 2.0.0
   */
  ConfigError,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ConfigProvider.ts.html
   *
   * @since 2.0.0
   */
  ConfigProvider,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ConfigSecret.ts.html
   *
   * @since 2.0.0
   */
  ConfigSecret,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Console.ts.html
   *
   * @since 2.0.0
   */
  Console,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Context.ts.html
   *
   * @since 2.0.0
   */
  Context,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Data.ts.html
   *
   * @since 2.0.0
   */
  Data,
  /**
   * Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
   *
   * @since 2.0.0
   */
  DefaultServices,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
   *
   * @since 2.0.0
   */
  Deferred,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Differ.ts.html
   *
   * @since 2.0.0
   */
  Differ,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Duration.ts.html
   *
   * @since 2.0.0
   */
  Duration,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
   *
   * @since 2.0.0
   */
  Effect,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Either.ts.html
   *
   * @since 2.0.0
   */
  Either,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Equal.ts.html
   *
   * @since 2.0.0
   */
  Equal,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Equivalence.ts.html
   *
   * @since 2.0.0
   */
  Equivalence,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
   *
   * @since 2.0.0
   */
  ExecutionStrategy,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
   *
   * @since 2.0.0
   */
  Exit,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
   *
   * @since 2.0.0
   */
  Fiber,
  /**
   * Docs: https://effect-ts.github.io/io/modules/FiberId.ts.html
   *
   * @since 2.0.0
   */
  FiberId,
  /**
   * Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
   *
   * @since 2.0.0
   */
  FiberRef,
  /**
   * Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
   *
   * @since 2.0.0
   */
  FiberRefs,
  /**
   * Docs: https://effect-ts.github.io/io/modules/FiberRefsPatch.ts.html
   *
   * @since 2.0.0
   */
  FiberRefsPatch,
  /**
   * Docs: https://effect-ts.github.io/io/modules/FiberStatus.ts.html
   *
   * @since 2.0.0
   */
  FiberStatus,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#flow
   *
   * @since 2.0.0
   */
  flow,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html
   *
   * @since 2.0.0
   */
  Function,
  /**
   * Docs: https://effect-ts.github.io/data/modules/GlobalValue.ts.html
   *
   * @since 2.0.0
   */
  GlobalValue,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/GroupBy.ts.html
   *
   * @since 2.0.0
   */
  GroupBy,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Hash.ts.html
   *
   * @since 2.0.0
   */
  Hash,
  /**
   * Docs: https://effect-ts.github.io/data/modules/HashMap.ts.html
   *
   * @since 2.0.0
   */
  HashMap,
  /**
   * Docs: https://effect-ts.github.io/data/modules/HashSet.ts.html
   *
   * @since 2.0.0
   */
  HashSet,
  /**
   * Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
   *
   * @since 2.0.0
   */
  HKT,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#hole
   *
   * @since 2.0.0
   */
  hole,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
   *
   * @since 2.0.0
   */
  Hub,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#identity
   *
   * @since 2.0.0
   */
  identity,
  /**
   * Docs: https://effect-ts.github.io/io/modules/KeyedPool.ts.html
   *
   * @since 2.0.0
   */
  KeyedPool,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
   *
   * @since 2.0.0
   */
  Layer,
  /**
   * Docs: https://effect-ts.github.io/data/modules/List.ts.html
   *
   * @since 2.0.0
   */
  List,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
   *
   * @since 2.0.0
   */
  Logger,
  /**
   * Docs: https://effect-ts.github.io/io/modules/LogLevel.ts.html
   *
   * @since 2.0.0
   */
  LogLevel,
  /**
   * Docs: https://effect-ts.github.io/io/modules/LogSpan.ts.html
   *
   * @since 2.0.0
   */
  LogSpan,
  /**
   * Docs: https://effect-ts.github.io/match/modules/index.ts.html
   *
   * @since 2.0.0
   */
  Match,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
   *
   * @since 2.0.0
   */
  Metric,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricBoundaries.ts.html
   *
   * @since 2.0.0
   */
  MetricBoundaries,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricHook.ts.html
   *
   * @since 2.0.0
   */
  MetricHook,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricKey.ts.html
   *
   * @since 2.0.0
   */
  MetricKey,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricKeyType.ts.html
   *
   * @since 2.0.0
   */
  MetricKeyType,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricLabel.ts.html
   *
   * @since 2.0.0
   */
  MetricLabel,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricPair.ts.html
   *
   * @since 2.0.0
   */
  MetricPair,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricPollingPolling.ts.html
   *
   * @since 2.0.0
   */
  MetricPolling,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricRegistry.ts.html
   *
   * @since 2.0.0
   */
  MetricRegistry,
  /**
   * Docs: https://effect-ts.github.io/io/modules/MetricState.ts.html
   *
   * @since 2.0.0
   */
  MetricState,
  /**
   * Docs: https://effect-ts.github.io/data/modules/MutableHashMap.ts.html
   *
   * @since 2.0.0
   */
  MutableHashMap,
  /**
   * Docs: https://effect-ts.github.io/data/modules/MutableHashSet.ts.html
   *
   * @since 2.0.0
   */
  MutableHashSet,
  /**
   * Docs: https://effect-ts.github.io/data/modules/MutableList.ts.html
   *
   * @since 2.0.0
   */
  MutableList,
  /**
   * Docs: https://effect-ts.github.io/data/modules/MutableQueue.ts.html
   *
   * @since 2.0.0
   */
  MutableQueue,
  /**
   * Docs: https://effect-ts.github.io/data/modules/mutable/MutableRef.ts.html
   *
   * @since 2.0.0
   */
  MutableRef,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Number.ts.html
   *
   * @since 2.0.0
   */
  Number,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Option.ts.html
   *
   * @since 2.0.0
   */
  Option,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Order.ts.html
   *
   * @since 2.0.0
   */
  Order,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Ordering.ts.html
   *
   * @since 2.0.0
   */
  Ordering,
  /**
   * Docs: https://effect-ts.github.io/data/modules/PCGRandom.ts.html
   *
   * @since 2.0.0
   */
  PCGRandom,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#pipe
   *
   * @since 2.0.0
   */
  pipe,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Pipeable.ts.html
   *
   * @since 2.0.0
   */
  Pipeable,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Pool.ts.html
   *
   * @since 2.0.0
   */
  Pool,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Predicate.ts.html
   *
   * @since 2.0.0
   */
  Predicate,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
   *
   * @since 2.0.0
   */
  Queue,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Random.ts.html
   *
   * @since 2.0.0
   */
  Random,
  /**
   * Docs: https://effect-ts.github.io/data/modules/ReadonlyArray.ts.html
   *
   * @since 2.0.0
   */
  ReadonlyArray,
  /**
   * Docs: https://effect-ts.github.io/data/modules/ReadonlyRecord.ts.html
   *
   * @since 2.0.0
   */
  ReadonlyRecord,
  /**
   * Docs: https://effect-ts.github.io/data/modules/RedBlackTree.ts.html
   *
   * @since 2.0.0
   */
  RedBlackTree,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
   *
   * @since 2.0.0
   */
  Ref,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
   *
   * @since 2.0.0
   */
  Reloadable,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Request.ts.html
   *
   * @since 2.0.0
   */
  Request,
  /**
   * Docs: https://effect-ts.github.io/io/modules/RequestBlock.ts.html
   *
   * @since 2.0.0
   */
  RequestBlock,
  /**
   * Docs: https://effect-ts.github.io/io/modules/RequestResolver.ts.html
   *
   * @since 2.0.0
   */
  RequestResolver,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Resource.ts.html
   *
   * @since 2.0.0
   */
  Resource,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
   *
   * @since 2.0.0
   */
  Runtime,
  /**
   * Docs: https://effect-ts.github.io/io/modules/RuntimeFlags.ts.html
   *
   * @since 2.0.0
   */
  RuntimeFlags,
  /**
   * Docs: https://effect-ts.github.io/io/modules/RuntimeFlagsPatch.ts.html
   *
   * @since 2.0.0
   */
  RuntimeFlagsPatch,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
   *
   * @since 2.0.0
   */
  Schedule,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ScheduleDecision.ts.html
   *
   * @since 2.0.0
   */
  ScheduleDecision,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ScheduleInterval.ts.html
   *
   * @since 2.0.0
   */
  ScheduleInterval,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ScheduleIntervals.ts.html
   *
   * @since 2.0.0
   */
  ScheduleIntervals,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Scheduler.ts.html
   *
   * @since 2.0.0
   */
  Scheduler,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
   *
   * @since 2.0.0
   */
  Scope,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ScopedCache.ts.html
   *
   * @since 2.0.0
   */
  ScopedCache,
  /**
   * Docs: https://effect-ts.github.io/io/modules/ScopedRef.ts.html
   *
   * @since 2.0.0
   */
  ScopedRef,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Sink.ts.html
   *
   * @since 2.0.0
   */
  Sink,
  /**
   * Docs: https://effect-ts.github.io/data/modules/SortedMap.ts.html
   *
   * @since 2.0.0
   */
  SortedMap,
  /**
   * Docs: https://effect-ts.github.io/data/modules/SortedSet.ts.html
   *
   * @since 2.0.0
   */
  SortedSet,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/STM.ts.html
   *
   * @since 2.0.0
   */
  STM,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Stream.ts.html
   *
   * @since 2.0.0
   */
  Stream,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Stream/Emit.ts.html
   *
   * @since 2.0.0
   */
  StreamEmit,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Stream/HaltStrategy.ts.html
   *
   * @since 2.0.0
   */
  StreamHaltStrategy,
  /**
   * Docs: https://effect-ts.github.io/data/modules/String.ts.html
   *
   * @since 2.0.0
   */
  String,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Struct.ts.html
   *
   * @since 2.0.0
   */
  Struct,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/SubscriptionRef.ts.html
   *
   * @since 2.0.0
   */
  SubscriptionRef,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
   *
   * @since 2.0.0
   */
  Supervisor,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Symbol.ts.html
   *
   * @since 2.0.0
   */
  Symbol,
  /**
   * Docs: https://effect-ts.github.io/io/modules/SynchronizedRef.ts.html
   *
   * @since 2.0.0
   */
  SynchronizedRef,
  /**
   * Docs: https://effect-ts.github.io/stream/modules/Take.ts.html
   *
   * @since 2.0.0
   */
  Take,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TArray.ts.html
   *
   * @since 2.0.0
   */
  TArray,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TDeferred.ts.html
   *
   * @since 2.0.0
   */
  TDeferred,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/THub.ts.html
   *
   * @since 2.0.0
   */
  THub,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TMap.ts.html
   *
   * @since 2.0.0
   */
  TMap,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TPriorityQueue.ts.html
   *
   * @since 2.0.0
   */
  TPriorityQueue,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TQueue.ts.html
   *
   * @since 2.0.0
   */
  TQueue,
  /**
   * Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
   *
   * @since 2.0.0
   */
  Tracer,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TRandom.ts.html
   *
   * @since 2.0.0
   */
  TRandom,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TReentrantLock.ts.html
   *
   * @since 2.0.0
   */
  TReentrantLock,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TRef.ts.html
   *
   * @since 2.0.0
   */
  TRef,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TSemaphore.ts.html
   *
   * @since 2.0.0
   */
  TSemaphore,
  /**
   * Docs: https://effect-ts.github.io/stm/modules/TSet.ts.html
   *
   * @since 2.0.0
   */
  TSet,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Tuple.ts.html
   *
   * @since 2.0.0
   */
  Tuple,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Types.ts.html
   *
   * @since 2.0.0
   */
  Types,
  /**
   * Docs: https://effect-ts.github.io/data/modules/Function.ts.html#unsafecoerce
   *
   * @since 2.0.0
   */
  unsafeCoerce
}
