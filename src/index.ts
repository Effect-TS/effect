/**
 * @since 2.0.0
 */

export {
  /**
   * @since 2.0.0
   */
  absurd,
  /**
   * @since 2.0.0
   */
  flow,
  /**
   * @since 2.0.0
   */
  hole,
  /**
   * @since 2.0.0
   */
  identity,
  /**
   * @since 2.0.0
   */
  pipe,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
} from "./Function.js"

export {
  /**
   * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
   * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
   *
   * A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
   * (such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.
   *
   * Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
   * decimal point. Therefore, the precision *is not* actually arbitrary, but limited to 2<sup>63</sup> decimal places.
   *
   * It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
   * may be unexpected.
   *
   * @since 2.0.0
   */
  BigDecimal
} from "./BigDecimal.js"

export {
  /**
   * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
   * It includes functions for basic arithmetic operations, as well as type class instances for
   * `Equivalence` and `Order`.
   *
   * @since 2.0.0
   */
  BigInt
} from "./BigInt.js"

export {
  /**
   * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
   * It includes functions for basic boolean operations, as well as type class instances for
   * `Equivalence` and `Order`.
   *
   * @since 2.0.0
   */
  Boolean
} from "./Boolean.js"

export {
  /**
   * @since 2.0.0
   */
  Brand
} from "./Brand.js"

export {
  /**
   * @since 2.0.0
   */
  Cache
} from "./Cache.js"

export {
  /**
   * @since 2.0.0
   */
  Cause
} from "./Cause.js"

export {
  /**
   * @since 2.0.0
   */
  Channel
} from "./Channel.js"

export {
  /**
   * @since 2.0.0
   */
  ChildExecutorDecision
} from "./ChildExecutorDecision.js"

export {
  /**
   * @since 2.0.0
   */
  Chunk
} from "./Chunk.js"

export {
  /**
   * @since 2.0.0
   */
  Clock
} from "./Clock.js"

export {
  /**
   * @since 2.0.0
   */
  Config
} from "./Config.js"

export {
  /**
   * @since 2.0.0
   */
  ConfigError
} from "./ConfigError.js"

export {
  /**
   * @since 2.0.0
   */
  ConfigProvider
} from "./ConfigProvider.js"

export {
  /**
   * @since 2.0.0
   */
  ConfigProviderPathPatch
} from "./ConfigProviderPathPatch.js"

export {
  /**
   * @since 2.0.0
   */
  ConfigSecret
} from "./ConfigSecret.js"

export {
  /**
   * @since 2.0.0
   */
  Console
} from "./Console.js"

export {
  /**
   * @since 2.0.0
   */
  Context
} from "./Context.js"

export {
  /**
   * @since 2.0.0
   */
  Data
} from "./Data.js"

export {
  /**
   * @since 2.0.0
   */
  DefaultServices
} from "./DefaultServices.js"

export {
  /**
   * @since 2.0.0
   */
  Deferred
} from "./Deferred.js"

export {
  /**
   * @since 2.0.0
   */
  Differ
} from "./Differ.js"

export {
  /**
   * @since 2.0.0
   */
  Duration
} from "./Duration.js"

export {
  /**
   * @since 2.0.0
   */
  Effect
} from "./Effect.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Effectable
} from "./Effectable.js"

export {
  /**
   * @since 2.0.0
   */
  Either
} from "./Either.js"

export {
  /**
   * This module provides encoding & decoding functionality for:
   *
   * - base64 (RFC4648)
   * - base64 (URL)
   * - hex
   *
   * @since 2.0.0
   */
  Encoding
} from "./Encoding.js"

export {
  /**
   * @since 2.0.0
   */
  Equal
} from "./Equal.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Equivalence
} from "./Equivalence.js"

export {
  /**
   * @since 2.0.0
   */
  ExecutionStrategy
} from "./ExecutionStrategy.js"

export {
  /**
   * @since 2.0.0
   */
  Exit
} from "./Exit.js"

export {
  /**
   * @since 2.0.0
   */
  Fiber
} from "./Fiber.js"

export {
  /**
   * @since 2.0.0
   */
  FiberId
} from "./FiberId.js"

export {
  /**
   * @since 2.0.0
   */
  FiberRef
} from "./FiberRef.js"

export {
  /**
   * @since 2.0.0
   */
  FiberRefs
} from "./FiberRefs.js"

export {
  /**
   * @since 2.0.0
   */
  FiberRefsPatch
} from "./FiberRefsPatch.js"

export {
  /**
   * @since 2.0.0
   */
  FiberStatus
} from "./FiberStatus.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Function
} from "./Function.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  GlobalValue
} from "./GlobalValue.js"

export {
  /**
   * @since 2.0.0
   */
  GroupBy
} from "./GroupBy.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  HKT
} from "./HKT.js"

export {
  /**
   * @since 2.0.0
   */
  Hash
} from "./Hash.js"

export {
  /**
   * @since 2.0.0
   */
  HashMap
} from "./HashMap.js"

export {
  /**
   * @since 2.0.0
   */
  HashSet
} from "./HashSet.js"

export {
  /**
   * @since 2.0.0
   */
  Inspectable
} from "./Inspectable.js"

export {
  /**
   * @since 2.0.0
   */
  KeyedPool
} from "./KeyedPool.js"

export {
  /**
   * @since 2.0.0
   */
  Layer
} from "./Layer.js"

export {
  /**
   * @since 2.0.0
   */
  List
} from "./List.js"

export {
  /**
   * @since 2.0.0
   */
  LogLevel
} from "./LogLevel.js"

export {
  /**
   * @since 2.0.0
   */
  LogSpan
} from "./LogSpan.js"

export {
  /**
   * @since 2.0.0
   */
  Logger
} from "./Logger.js"

export {
  /**
   * @since 2.0.0
   */
  Match
} from "./Match.js"

export {
  /**
   * @since 2.0.0
   */
  MergeDecision
} from "./MergeDecision.js"

export {
  /**
   * @since 2.0.0
   */
  MergeState
} from "./MergeState.js"

export {
  /**
   * @since 2.0.0
   */
  MergeStrategy
} from "./MergeStrategy.js"

export {
  /**
   * @since 2.0.0
   */
  Metric
} from "./Metric.js"

export {
  /**
   * @since 2.0.0
   */
  MetricBoundaries
} from "./MetricBoundaries.js"

export {
  /**
   * @since 2.0.0
   */
  MetricHook
} from "./MetricHook.js"

export {
  /**
   * @since 2.0.0
   */
  MetricKey
} from "./MetricKey.js"

export {
  /**
   * @since 2.0.0
   */
  MetricKeyType
} from "./MetricKeyType.js"

export {
  /**
   * @since 2.0.0
   */
  MetricLabel
} from "./MetricLabel.js"

export {
  /**
   * @since 2.0.0
   */
  MetricPair
} from "./MetricPair.js"

export {
  /**
   * @since 2.0.0
   */
  MetricPolling
} from "./MetricPolling.js"

export {
  /**
   * @since 2.0.0
   */
  MetricRegistry
} from "./MetricRegistry.js"

export {
  /**
   * @since 2.0.0
   */
  MetricState
} from "./MetricState.js"

export {
  /**
   * @since 2.0.0
   */
  MutableHashMap
} from "./MutableHashMap.js"

export {
  /**
   * @since 2.0.0
   */
  MutableHashSet
} from "./MutableHashSet.js"

export {
  /**
   * @since 2.0.0
   */
  MutableList
} from "./MutableList.js"

export {
  /**
   * @since 2.0.0
   */
  MutableQueue
} from "./MutableQueue.js"

export {
  /**
   * @since 2.0.0
   */
  MutableRef
} from "./MutableRef.js"

export {
  /**
   * @since 2.0.0
   */
  NonEmptyIterable
} from "./NonEmptyIterable.js"

export {
  /**
   * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
   * It includes functions for basic arithmetic operations, as well as type class instances for
   * `Equivalence` and `Order`.
   *
   * @since 2.0.0
   */
  Number
} from "./Number.js"

export {
  /**
   * @since 2.0.0
   */
  Option
} from "./Option.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Order
} from "./Order.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Ordering
} from "./Ordering.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Pipeable
} from "./Pipeable.js"

export {
  /**
   * @since 2.0.0
   */
  Pool
} from "./Pool.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Predicate
} from "./Predicate.js"

export {
  /**
   * @since 2.0.0
   */
  PubSub
} from "./PubSub.js"

export {
  /**
   * @since 2.0.0
   */
  Queue
} from "./Queue.js"

export {
  /**
   * @since 2.0.0
   */
  Random
} from "./Random.js"

export {
  /**
   * @since 2.0.0
   */
  ReadonlyArray
} from "./ReadonlyArray.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  ReadonlyRecord
} from "./ReadonlyRecord.js"

export {
  /**
   * @since 2.0.0
   */
  RedBlackTree
} from "./RedBlackTree.js"

export {
  /**
   * @since 2.0.0
   */
  Ref
} from "./Ref.js"

export {
  /**
   * @since 2.0.0
   */
  Reloadable
} from "./Reloadable.js"

export {
  /**
   * @since 2.0.0
   */
  Request
} from "./Request.js"

export {
  /**
   * @since 2.0.0
   */
  RequestBlock
} from "./RequestBlock.js"

export {
  /**
   * @since 2.0.0
   */
  RequestResolver
} from "./RequestResolver.js"

export {
  /**
   * @since 2.0.0
   */
  Resource
} from "./Resource.js"

export {
  /**
   * @since 2.0.0
   */
  Runtime
} from "./Runtime.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  RuntimeFlags
} from "./RuntimeFlags.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  RuntimeFlagsPatch
} from "./RuntimeFlagsPatch.js"

export {
  /**
   * @since 2.0.0
   */
  STM
} from "./STM.js"

export {
  /**
   * @since 2.0.0
   */
  Schedule
} from "./Schedule.js"

export {
  /**
   * @since 2.0.0
   */
  ScheduleDecision
} from "./ScheduleDecision.js"

export {
  /**
   * @since 2.0.0
   */
  ScheduleInterval
} from "./ScheduleInterval.js"

export {
  /**
   * @since 2.0.0
   */
  ScheduleIntervals
} from "./ScheduleIntervals.js"

export {
  /**
   * @since 2.0.0
   */
  Scheduler
} from "./Scheduler.js"

export {
  /**
   * @since 2.0.0
   */
  Scope
} from "./Scope.js"

export {
  /**
   * @since 2.0.0
   */
  ScopedCache
} from "./ScopedCache.js"

export {
  /**
   * @since 2.0.0
   */
  ScopedRef
} from "./ScopedRef.js"

export {
  /**
   * @since 2.0.0
   */
  SingleProducerAsyncInput
} from "./SingleProducerAsyncInput.js"

export {
  /**
   * @since 2.0.0
   */
  Sink
} from "./Sink.js"

export {
  /**
   * @since 2.0.0
   */
  SortedMap
} from "./SortedMap.js"

export {
  /**
   * @since 2.0.0
   */
  SortedSet
} from "./SortedSet.js"

export {
  /**
   * @since 2.0.0
   */
  Stream
} from "./Stream.js"

export {
  /**
   * @since 2.0.0
   */
  StreamEmit
} from "./StreamEmit.js"

export {
  /**
   * @since 2.0.0
   */
  StreamHaltStrategy
} from "./StreamHaltStrategy.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Streamable
} from "./Streamable.js"

export {
  /**
   * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
   * It includes functions for basic string manipulation, as well as type class instances for
   * `Equivalence` and `Order`.
   *
   * @since 2.0.0
   */
  String
} from "./String.js"

export {
  /**
   * This module provides utility functions for working with structs in TypeScript.
   *
   * @since 2.0.0
   */
  Struct
} from "./Struct.js"

export {
  /**
   * @since 2.0.0
   */
  SubscriptionRef
} from "./SubscriptionRef.js"

export {
  /**
   * @since 2.0.0
   */
  Supervisor
} from "./Supervisor.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Symbol
} from "./Symbol.js"

export {
  /**
   * @since 2.0.0
   */
  SynchronizedRef
} from "./SynchronizedRef.js"

export {
  /**
   * @since 2.0.0
   */
  TArray
} from "./TArray.js"

export {
  /**
   * @since 2.0.0
   */
  TDeferred
} from "./TDeferred.js"

export {
  /**
   * @since 2.0.0
   */
  TMap
} from "./TMap.js"

export {
  /**
   * @since 2.0.0
   */
  TPriorityQueue
} from "./TPriorityQueue.js"

export {
  /**
   * @since 2.0.0
   */
  TPubSub
} from "./TPubSub.js"

export {
  /**
   * @since 2.0.0
   */
  TQueue
} from "./TQueue.js"

export {
  /**
   * @since 2.0.0
   */
  TRandom
} from "./TRandom.js"

export {
  /**
   * @since 2.0.0
   */
  TReentrantLock
} from "./TReentrantLock.js"

export {
  /**
   * @since 2.0.0
   */
  TRef
} from "./TRef.js"

export {
  /**
   * @since 2.0.0
   */
  TSemaphore
} from "./TSemaphore.js"

export {
  /**
   * @since 2.0.0
   */
  TSet
} from "./TSet.js"

export {
  /**
   * @since 2.0.0
   */
  Take
} from "./Take.js"

export {
  /**
   * @since 2.0.0
   */
  TestAnnotation
} from "./TestAnnotation.js"

export {
  /**
   * @since 2.0.0
   */
  TestAnnotationMap
} from "./TestAnnotationMap.js"

export {
  /**
   * @since 2.0.0
   */
  TestAnnotations
} from "./TestAnnotations.js"

export {
  /**
   * @since 2.0.0
   */
  TestClock
} from "./TestClock.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  TestConfig
} from "./TestConfig.js"

export {
  /**
   * @since 2.0.0
   */
  TestContext
} from "./TestContext.js"

export {
  /**
   * @since 2.0.0
   */
  TestLive
} from "./TestLive.js"

export {
  /**
   * @since 2.0.0
   */
  TestServices
} from "./TestServices.js"

export {
  /**
   * @since 2.0.0
   */
  TestSized
} from "./TestSized.js"

export {
  /**
   * @since 2.0.0
   */
  Tracer
} from "./Tracer.js"

export {
  /**
   * This module provides utility functions for working with tuples in TypeScript.
   *
   * @since 2.0.0
   */
  Tuple
} from "./Tuple.js"

export {
  /**
   * A collection of types that are commonly used types.
   *
   * @since 2.0.0
   */
  Types
} from "./Types.js"

export {
  /**
   * @since 2.0.0
   */
  Unify
} from "./Unify.js"

export {
  /**
   * @since 2.0.0
   */
  UpstreamPullRequest
} from "./UpstreamPullRequest.js"

export {
  /**
   * @since 2.0.0
   */
  UpstreamPullStrategy
} from "./UpstreamPullStrategy.js"

export {
  /**
   * @since 2.0.0
   * @internal
   */
  Utils
} from "./Utils.js"
