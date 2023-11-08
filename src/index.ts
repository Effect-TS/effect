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
export { BigDecimal } from "./BigDecimal.js"

/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export { BigInt } from "./BigInt.js"

/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export { Boolean } from "./Boolean.js"

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
export { Brand } from "./Brand.js"

/**
 * @since 2.0.0
 */
export { Cache } from "./Cache.js"

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
export { Cause } from "./Cause.js"

/**
 * @since 2.0.0
 */
export { Channel } from "./Channel.js"

/**
 * @since 2.0.0
 */
export { ChildExecutorDecision } from "./ChildExecutorDecision.js"

/**
 * @since 2.0.0
 */
export { Chunk } from "./Chunk.js"

/**
 * @since 2.0.0
 */
export { Clock } from "./Clock.js"

/**
 * @since 2.0.0
 */
export { Config } from "./Config.js"

/**
 * @since 2.0.0
 */
export { ConfigError } from "./ConfigError.js"

/**
 * @since 2.0.0
 */
export { ConfigProvider } from "./ConfigProvider.js"

/**
 * @since 2.0.0
 */
export { PathPatch as ConfigProviderPathPatch } from "./ConfigProviderPathPatch.js"

/**
 * @since 2.0.0
 */
export { ConfigSecret } from "./ConfigSecret.js"

/**
 * @since 2.0.0
 */
export { Console } from "./Console.js"

/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
export { Context } from "./Context.js"

/**
 * @since 2.0.0
 */
export { Data } from "./Data.js"

/**
 * @since 2.0.0
 */
export { DefaultServices } from "./DefaultServices.js"

/**
 * @since 2.0.0
 */
export { Deferred } from "./Deferred.js"

/**
 * @since 2.0.0
 */
export { Differ } from "./Differ.js"

/**
 * @since 2.0.0
 */
export { Duration } from "./Duration.js"

/**
 * @since 2.0.0
 */
export { Effect } from "./Effect.js"

/**
 * @since 2.0.0
 */
export { Effectable } from "./Effectable.js"

/**
 * @since 2.0.0
 */
export { Either } from "./Either.js"

/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 2.0.0
 */
export { Encoding } from "./Encoding.js"

/**
 * @since 2.0.0
 */
export { Equal } from "./Equal.js"

/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 2.0.0
 */
export { Equivalence } from "./Equivalence.js"

/**
 * @since 2.0.0
 */
export { ExecutionStrategy } from "./ExecutionStrategy.js"

/**
 * @since 2.0.0
 */
export { Exit } from "./Exit.js"

/**
 * @since 2.0.0
 */
export { Fiber } from "./Fiber.js"

/**
 * @since 2.0.0
 */
export { FiberId } from "./FiberId.js"

/**
 * @since 2.0.0
 */
export { FiberRef } from "./FiberRef.js"

/**
 * @since 2.0.0
 */
export { FiberRefs } from "./FiberRefs.js"

/**
 * @since 2.0.0
 */
export { FiberRefsPatch } from "./FiberRefsPatch.js"

/**
 * @since 2.0.0
 */
export { FiberStatus } from "./FiberStatus.js"

/**
 * @since 2.0.0
 */
export { Function } from "./Function.js"

/**
 * @since 2.0.0
 */
export { GlobalValue } from "./GlobalValue.js"

/**
 * @since 2.0.0
 */
export { GroupBy } from "./GroupBy.js"

/**
 * @since 2.0.0
 */
export { HKT } from "./HKT.js"

/**
 * @since 2.0.0
 */
export { Hash } from "./Hash.js"

/**
 * @since 2.0.0
 */
export { HashMap } from "./HashMap.js"

/**
 * @since 2.0.0
 */
export { HashSet } from "./HashSet.js"

/**
 * @since 2.0.0
 */
export { Inspectable } from "./Inspectable.js"

/**
 * @since 2.0.0
 */
export { KeyedPool } from "./KeyedPool.js"

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
export { Layer } from "./Layer.js"

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
export { List } from "./List.js"

/**
 * @since 2.0.0
 */
export { LogLevel } from "./LogLevel.js"

/**
 * @since 2.0.0
 */
export { LogSpan } from "./LogSpan.js"

/**
 * @since 2.0.0
 */
export { Logger } from "./Logger.js"

/**
 * @since 1.0.0
 */
export { Match } from "./Match.js"

/**
 * @since 2.0.0
 */
export { MergeDecision } from "./MergeDecision.js"

/**
 * @since 2.0.0
 */
export { MergeState } from "./MergeState.js"

/**
 * @since 2.0.0
 */
export { MergeStrategy } from "./MergeStrategy.js"

/**
 * @since 2.0.0
 */
export { Metric } from "./Metric.js"

/**
 * @since 2.0.0
 */
export { MetricBoundaries } from "./MetricBoundaries.js"

/**
 * @since 2.0.0
 */
export { MetricHook } from "./MetricHook.js"

/**
 * @since 2.0.0
 */
export { MetricKey } from "./MetricKey.js"

/**
 * @since 2.0.0
 */
export { MetricKeyType } from "./MetricKeyType.js"

/**
 * @since 2.0.0
 */
export { MetricLabel } from "./MetricLabel.js"

/**
 * @since 2.0.0
 */
export { MetricPair } from "./MetricPair.js"

/**
 * @since 2.0.0
 */
export { PollingMetric as MetricPolling } from "./MetricPolling.js"

/**
 * @since 2.0.0
 */
export { MetricRegistry } from "./MetricRegistry.js"

/**
 * @since 2.0.0
 */
export { MetricState } from "./MetricState.js"

/**
 * @since 2.0.0
 */
export { MutableHashMap } from "./MutableHashMap.js"

/**
 * @since 2.0.0
 */
export { MutableHashSet } from "./MutableHashSet.js"

/**
 * @since 2.0.0
 */
export { MutableList } from "./MutableList.js"

/**
 * @since 2.0.0
 */
export { MutableQueue } from "./MutableQueue.js"

/**
 * @since 2.0.0
 */
export { MutableRef } from "./MutableRef.js"

/**
 * @since 2.0.0
 */
export { NonEmptyIterable } from "./NonEmptyIterable.js"

/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export { Number } from "./Number.js"

/**
 * @since 2.0.0
 */
export { Option } from "./Option.js"

/**
 * @since 2.0.0
 */
export { Order } from "./Order.js"

/**
 * @since 2.0.0
 */
export { Ordering } from "./Ordering.js"

/**
 * @since 2.0.0
 */
export { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export { Pool } from "./Pool.js"

/**
 * @since 2.0.0
 */
export { Predicate } from "./Predicate.js"

/**
 * @since 2.0.0
 */
export { PubSub } from "./PubSub.js"

/**
 * @since 2.0.0
 */
export { Queue } from "./Queue.js"

/**
 * @since 2.0.0
 */
export { Random } from "./Random.js"

/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 2.0.0
 */
export { ReadonlyArray } from "./ReadonlyArray.js"

/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */
export { ReadonlyRecord } from "./ReadonlyRecord.js"

/**
 * @since 2.0.0
 */
export { RedBlackTree } from "./RedBlackTree.js"

/**
 * @since 2.0.0
 */
export { Ref } from "./Ref.js"

/**
 * @since 2.0.0
 */
export { Reloadable } from "./Reloadable.js"

/**
 * @since 2.0.0
 */
export { Request } from "./Request.js"

/**
 * @since 2.0.0
 */
export { RequestBlock } from "./RequestBlock.js"

/**
 * @since 2.0.0
 */
export { RequestResolver } from "./RequestResolver.js"

/**
 * @since 2.0.0
 */
export { Resource } from "./Resource.js"

/**
 * @since 2.0.0
 */
export { Runtime } from "./Runtime.js"

/**
 * @since 2.0.0
 */
export { RuntimeFlags } from "./RuntimeFlags.js"

/**
 * @since 2.0.0
 */
export { RuntimeFlagsPatch } from "./RuntimeFlagsPatch.js"

/**
 * @since 2.0.0
 */
export { STM } from "./STM.js"

/**
 * @since 2.0.0
 */
export { Schedule } from "./Schedule.js"

/**
 * @since 2.0.0
 */
export { ScheduleDecision } from "./ScheduleDecision.js"

/**
 * @since 2.0.0
 */
export { ScheduleInterval } from "./ScheduleInterval.js"

/**
 * @since 2.0.0
 */
export { ScheduleIntervals as ScheduleIntervals } from "./ScheduleIntervals.js"

/**
 * @since 2.0.0
 */
export { Scheduler } from "./Scheduler.js"

/**
 * @since 2.0.0
 */
export { Scope } from "./Scope.js"

/**
 * @since 2.0.0
 */
export { ScopedCache } from "./ScopedCache.js"

/**
 * @since 2.0.0
 */
export { ScopedRef } from "./ScopedRef.js"

/**
 * @since 2.0.0
 */
export { SingleProducerAsyncInput } from "./SingleProducerAsyncInput.js"

/**
 * @since 2.0.0
 */
export { Sink } from "./Sink.js"

/**
 * @since 2.0.0
 */
export { SortedMap } from "./SortedMap.js"

/**
 * @since 2.0.0
 */
export { SortedSet } from "./SortedSet.js"

/**
 * @since 2.0.0
 */
export { Stream } from "./Stream.js"

/**
 * @since 2.0.0
 */
export { StreamEmit } from "./StreamEmit.js"

/**
 * @since 2.0.0
 */
export { HaltStrategy as StreamHaltStrategy } from "./StreamHaltStrategy.js"

/**
 * @since 2.0.0
 */
export { Streamable } from "./Streamable.js"

/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export { String } from "./String.js"

/**
 * This module provides utility functions for working with structs in TypeScript.
 *
 * @since 2.0.0
 */
export { Struct } from "./Struct.js"

/**
 * @since 2.0.0
 */
export { SubscriptionRef } from "./SubscriptionRef.js"

/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 2.0.0
 */
export { Supervisor } from "./Supervisor.js"

/**
 * @since 2.0.0
 */
export { Symbol } from "./Symbol.js"

/**
 * @since 2.0.0
 */
export { SynchronizedRef } from "./SynchronizedRef.js"

/**
 * @since 2.0.0
 */
export { TArray } from "./TArray.js"

/**
 * @since 2.0.0
 */
export { TDeferred } from "./TDeferred.js"

/**
 * @since 2.0.0
 */
export { TMap } from "./TMap.js"

/**
 * @since 2.0.0
 */
export { TPriorityQueue } from "./TPriorityQueue.js"

/**
 * @since 2.0.0
 */
export { TPubSub } from "./TPubSub.js"

/**
 * @since 2.0.0
 */
export { TQueue } from "./TQueue.js"

/**
 * @since 2.0.0
 */
export { TRandom } from "./TRandom.js"

/**
 * @since 2.0.0
 */
export { TReentrantLock } from "./TReentrantLock.js"

/**
 * @since 2.0.0
 */
export { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 */
export { TSemaphore } from "./TSemaphore.js"

/**
 * @since 2.0.0
 */
export { TSet } from "./TSet.js"

/**
 * @since 2.0.0
 */
export { Take } from "./Take.js"

/**
 * @since 2.0.0
 */
export { TestAnnotation } from "./TestAnnotation.js"

/**
 * @since 2.0.0
 */
export { TestAnnotationMap } from "./TestAnnotationMap.js"

/**
 * @since 2.0.0
 */
export { TestAnnotations } from "./TestAnnotations.js"

/**
 * @since 2.0.0
 */
export { TestClock } from "./TestClock.js"

/**
 * @since 2.0.0
 */
export { TestConfig } from "./TestConfig.js"

/**
 * @since 2.0.0
 */
export { TestContext } from "./TestContext.js"

/**
 * @since 2.0.0
 */
export { TestLive } from "./TestLive.js"

/**
 * @since 2.0.0
 */
export { TestServices } from "./TestServices.js"

/**
 * @since 2.0.0
 */
export { TestSized } from "./TestSized.js"

/**
 * @since 2.0.0
 */
export { Tracer } from "./Tracer.js"

/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 2.0.0
 */
export { Tuple } from "./Tuple.js"

/**
 * A collection of types that are commonly used types.
 *
 * @since 2.0.0
 */
export { Types } from "./Types.js"

/**
 * @since 2.0.0
 */
export { Unify } from "./Unify.js"

/**
 * @since 2.0.0
 */
export { UpstreamPullRequest } from "./UpstreamPullRequest.js"

/**
 * @since 2.0.0
 */
export { UpstreamPullStrategy } from "./UpstreamPullStrategy.js"

/**
 * @since 2.0.0
 */
export { Utils } from "./Utils.js"
