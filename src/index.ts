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
   * This module provides types and utility functions to create and work with branded types,
   * which are TypeScript types with an added type tag to prevent accidental usage of a value in the wrong context.
   *
   * The `refined` and `nominal` functions are both used to create branded types in TypeScript.
   * The main difference between them is that `refined` allows for validation of the data, while `nominal` does not.
   *
   * The `nominal` function is used to create a new branded type that has the same underlying type as the input, but with a different name.
   * This is useful when you want to distinguish between two values of the same type that have different meanings.
   * The `nominal` function does not perform any validation of the input data.
   *
   * On the other hand, the `refined` function is used to create a new branded type that has the same underlying type as the input,
   * but with a different name, and it also allows for validation of the input data.
   * The `refined` function takes a predicate that is used to validate the input data.
   * If the input data fails the validation, a `BrandErrors` is returned, which provides information about the specific validation failure.
   *
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
   * The `Effect<R, E, A>` type is polymorphic in values of type `E` and we can
   * work with any error type that we want. However, there is a lot of information
   * that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
   * somewhere to store things like unexpected errors or defects, stack and
   * execution traces, causes of fiber interruptions, and so forth.
   *
   * Effect-TS is very strict about preserving the full information related to a
   * failure. It captures all type of errors into the `Cause` data type. `Effect`
   * uses the `Cause<E>` data type to store the full story of failure. So its
   * error model is lossless. It doesn't throw information related to the failure
   * result. So we can figure out exactly what happened during the operation of
   * our effects.
   *
   * It is important to note that `Cause` is an underlying data type representing
   * errors occuring within an `Effect` workflow. Thus, we don't usually deal with
   * `Cause`s directly. Even though it is not a data type that we deal with very
   * often, the `Cause` of a failing `Effect` workflow can be accessed at any
   * time, which gives us total access to all parallel and sequential errors in
   * occurring within our codebase.
   *
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
   * This module provides a data structure called `Context` that can be used for dependency injection in effectful
   * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
   * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
   * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
   * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
   *
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
   * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
   * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
   * These properties are also known in mathematics as an "equivalence relation".
   *
   * @since 2.0.0
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
   */
  Function
} from "./Function.js"

export {
  /**
   * @since 2.0.0
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
   * A `Layer<RIn, E, ROut>` describes how to build one or more services in your
   * application. Services can be injected into effects via
   * `Effect.provideService`. Effects can require services via `Effect.service`.
   *
   * Layer can be thought of as recipes for producing bundles of services, given
   * their dependencies (other services).
   *
   * Construction of services can be effectful and utilize resources that must be
   * acquired and safely released when the services are done being utilized.
   *
   * By default layers are shared, meaning that if the same layer is used twice
   * the layer will only be allocated a single time.
   *
   * Because of their excellent composition properties, layers are the idiomatic
   * way in Effect-TS to create services that depend on other services.
   *
   * @since 2.0.0
   */
  Layer
} from "./Layer.js"

export {
  /**
   * A data type for immutable linked lists representing ordered collections of elements of type `A`.
   *
   * This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.
   *
   * **Performance**
   *
   * - Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
   * - Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.
   *
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
   */
  Order
} from "./Order.js"

export {
  /**
   * @since 2.0.0
   */
  Ordering
} from "./Ordering.js"

export {
  /**
   * @since 2.0.0
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
   * This module provides utility functions for working with arrays in TypeScript.
   *
   * @since 2.0.0
   */
  ReadonlyArray
} from "./ReadonlyArray.js"

export {
  /**
   * This module provides utility functions for working with records in TypeScript.
   *
   * @since 2.0.0
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
   */
  RuntimeFlags
} from "./RuntimeFlags.js"

export {
  /**
   * @since 2.0.0
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
   * A `Supervisor<T>` is allowed to supervise the launching and termination of
   * fibers, producing some visible value of type `T` from the supervision.
   *
   * @since 2.0.0
   */
  Supervisor
} from "./Supervisor.js"

export {
  /**
   * @since 2.0.0
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
   */
  Utils
} from "./Utils.js"
