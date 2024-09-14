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
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 2.0.0
 */
export * as Array from "./Array.js"

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
export * as BigDecimal from "./BigDecimal.js"

/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as BigInt from "./BigInt.js"

/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as Boolean from "./Boolean.js"

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
export * as Brand from "./Brand.js"

/**
 * @since 2.0.0
 */
export * as Cache from "./Cache.js"

/**
 * The `Effect<A, E, R>` type is polymorphic in values of type `E` and we can
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
export * as Cause from "./Cause.js"

/**
 * @since 2.0.0
 */
export * as Channel from "./Channel.js"

/**
 * @since 2.0.0
 */
export * as ChildExecutorDecision from "./ChildExecutorDecision.js"

/**
 * @since 2.0.0
 */
export * as Chunk from "./Chunk.js"

/**
 * @since 2.0.0
 */
export * as Clock from "./Clock.js"

/**
 * @since 2.0.0
 */
export * as Config from "./Config.js"

/**
 * @since 2.0.0
 */
export * as ConfigError from "./ConfigError.js"

/**
 * @since 2.0.0
 */
export * as ConfigProvider from "./ConfigProvider.js"

/**
 * @since 2.0.0
 */
export * as ConfigProviderPathPatch from "./ConfigProviderPathPatch.js"

/**
 * @since 2.0.0
 */
export * as Console from "./Console.js"

/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
export * as Context from "./Context.js"

/**
 * @since 2.0.0
 */
export * as Cron from "./Cron.js"

/**
 * @since 2.0.0
 */
export * as Data from "./Data.js"

/**
 * @since 3.6.0
 */
export * as DateTime from "./DateTime.js"

/**
 * @since 2.0.0
 */
export * as DefaultServices from "./DefaultServices.js"

/**
 * @since 2.0.0
 */
export * as Deferred from "./Deferred.js"

/**
 * @since 2.0.0
 */
export * as Differ from "./Differ.js"

/**
 * @since 2.0.0
 */
export * as Duration from "./Duration.js"

/**
 * @since 2.0.0
 */
export * as Effect from "./Effect.js"

/**
 * @since 2.0.0
 */
export * as Effectable from "./Effectable.js"

/**
 * @since 2.0.0
 */
export * as Either from "./Either.js"

/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 2.0.0
 */
export * as Encoding from "./Encoding.js"

/**
 * @since 2.0.0
 */
export * as Equal from "./Equal.js"

/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 2.0.0
 */
export * as Equivalence from "./Equivalence.js"

/**
 * @since 2.0.0
 */
export * as ExecutionStrategy from "./ExecutionStrategy.js"

/**
 * @since 2.0.0
 */
export * as Exit from "./Exit.js"

/**
 * @since 2.0.0
 */
export * as Fiber from "./Fiber.js"

/**
 * @since 2.0.0
 */
export * as FiberHandle from "./FiberHandle.js"

/**
 * @since 2.0.0
 */
export * as FiberId from "./FiberId.js"

/**
 * @since 2.0.0
 */
export * as FiberMap from "./FiberMap.js"

/**
 * @since 2.0.0
 */
export * as FiberRef from "./FiberRef.js"

/**
 * @since 2.0.0
 */
export * as FiberRefs from "./FiberRefs.js"

/**
 * @since 2.0.0
 */
export * as FiberRefsPatch from "./FiberRefsPatch.js"

/**
 * @since 2.0.0
 */
export * as FiberSet from "./FiberSet.js"

/**
 * @since 2.0.0
 */
export * as FiberStatus from "./FiberStatus.js"

/**
 * @since 2.0.0
 */
export * as Function from "./Function.js"

/**
 * @since 2.0.0
 */
export * as GlobalValue from "./GlobalValue.js"

/**
 * @since 2.0.0
 */
export * as GroupBy from "./GroupBy.js"

/**
 * @since 2.0.0
 */
export * as HKT from "./HKT.js"

/**
 * @since 2.0.0
 */
export * as Hash from "./Hash.js"

/**
 * @since 2.0.0
 */
export * as HashMap from "./HashMap.js"

/**
 * @since 2.0.0
 */
export * as HashSet from "./HashSet.js"

/**
 * @since 2.0.0
 */
export * as Inspectable from "./Inspectable.js"

/**
 * This module provides utility functions for working with Iterables in TypeScript.
 *
 * @since 2.0.0
 */
export * as Iterable from "./Iterable.js"

/**
 * @since 2.0.0
 */
export * as KeyedPool from "./KeyedPool.js"

/**
 * A `Layer<ROut, E, RIn>` describes how to build one or more services in your
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
export * as Layer from "./Layer.js"

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
export * as List from "./List.js"

/**
 * @since 2.0.0
 */
export * as LogLevel from "./LogLevel.js"

/**
 * @since 2.0.0
 */
export * as LogSpan from "./LogSpan.js"

/**
 * @since 2.0.0
 */
export * as Logger from "./Logger.js"

/**
 * @since 3.8.0
 * @experimental
 */
export * as Mailbox from "./Mailbox.js"

/**
 * @since 2.0.0
 */
export * as ManagedRuntime from "./ManagedRuntime.js"

/**
 * @since 1.0.0
 */
export * as Match from "./Match.js"

/**
 * @since 2.0.0
 */
export * as MergeDecision from "./MergeDecision.js"

/**
 * @since 2.0.0
 */
export * as MergeState from "./MergeState.js"

/**
 * @since 2.0.0
 */
export * as MergeStrategy from "./MergeStrategy.js"

/**
 * @since 2.0.0
 */
export * as Metric from "./Metric.js"

/**
 * @since 2.0.0
 */
export * as MetricBoundaries from "./MetricBoundaries.js"

/**
 * @since 2.0.0
 */
export * as MetricHook from "./MetricHook.js"

/**
 * @since 2.0.0
 */
export * as MetricKey from "./MetricKey.js"

/**
 * @since 2.0.0
 */
export * as MetricKeyType from "./MetricKeyType.js"

/**
 * @since 2.0.0
 */
export * as MetricLabel from "./MetricLabel.js"

/**
 * @since 2.0.0
 */
export * as MetricPair from "./MetricPair.js"

/**
 * @since 2.0.0
 */
export * as MetricPolling from "./MetricPolling.js"

/**
 * @since 2.0.0
 */
export * as MetricRegistry from "./MetricRegistry.js"

/**
 * @since 2.0.0
 */
export * as MetricState from "./MetricState.js"

/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.4.0
 * @experimental
 */
export * as Micro from "./Micro.js"

/**
 * @since 2.0.0
 *
 * Enables low level framework authors to run on their own isolated effect version
 */
export * as ModuleVersion from "./ModuleVersion.js"

/**
 * @since 2.0.0
 */
export * as MutableHashMap from "./MutableHashMap.js"

/**
 * @since 2.0.0
 */
export * as MutableHashSet from "./MutableHashSet.js"

/**
 * @since 2.0.0
 */
export * as MutableList from "./MutableList.js"

/**
 * @since 2.0.0
 */
export * as MutableQueue from "./MutableQueue.js"

/**
 * @since 2.0.0
 */
export * as MutableRef from "./MutableRef.js"

/**
 * @since 2.0.0
 */
export * as NonEmptyIterable from "./NonEmptyIterable.js"

/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as Number from "./Number.js"

/**
 * @since 2.0.0
 */
export * as Option from "./Option.js"

/**
 * This module provides an implementation of the `Order` type class which is used to define a total ordering on some type `A`.
 * An order is defined by a relation `<=`, which obeys the following laws:
 *
 * - either `x <= y` or `y <= x` (totality)
 * - if `x <= y` and `y <= x`, then `x == y` (antisymmetry)
 * - if `x <= y` and `y <= z`, then `x <= z` (transitivity)
 *
 * The truth table for compare is defined as follows:
 *
 * | `x <= y` | `x >= y` | Ordering |                       |
 * | -------- | -------- | -------- | --------------------- |
 * | `true`   | `true`   | `0`      | corresponds to x == y |
 * | `true`   | `false`  | `< 0`    | corresponds to x < y  |
 * | `false`  | `true`   | `> 0`    | corresponds to x > y  |
 *
 * @since 2.0.0
 */
export * as Order from "./Order.js"

/**
 * @since 2.0.0
 */
export * as Ordering from "./Ordering.js"

/**
 * @since 2.0.0
 */
export * as Pipeable from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * as Pool from "./Pool.js"

/**
 * @since 2.0.0
 */
export * as Predicate from "./Predicate.js"

/**
 * @since 2.0.0
 */
export * as PrimaryKey from "./PrimaryKey.js"

/**
 * @since 2.0.0
 */
export * as PubSub from "./PubSub.js"

/**
 * @since 2.0.0
 */
export * as Queue from "./Queue.js"

/**
 * @since 2.0.0
 */
export * as Random from "./Random.js"

/**
 * Limits the number of calls to a resource to a maximum amount in some interval.
 *
 * @since 2.0.0
 */
export * as RateLimiter from "./RateLimiter.js"

/**
 * @since 3.5.0
 */
export * as RcMap from "./RcMap.js"

/**
 * @since 3.5.0
 */
export * as RcRef from "./RcRef.js"

/**
 * @since 2.0.0
 */
export * as Readable from "./Readable.js"

/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */
export * as Record from "./Record.js"

/**
 * @since 2.0.0
 */
export * as RedBlackTree from "./RedBlackTree.js"

/**
 * The Redacted module provides functionality for handling sensitive information
 * securely within your application. By using the `Redacted` data type, you can
 * ensure that sensitive values are not accidentally exposed in logs or error
 * messages.
 *
 * @since 3.3.0
 */
export * as Redacted from "./Redacted.js"

/**
 * @since 2.0.0
 */
export * as Ref from "./Ref.js"

/**
 * This module provides utility functions for working with RegExp in TypeScript.
 *
 * @since 2.0.0
 */
export * as RegExp from "./RegExp.js"

/**
 * @since 2.0.0
 */
export * as Reloadable from "./Reloadable.js"

/**
 * @since 2.0.0
 */
export * as Request from "./Request.js"

/**
 * @since 2.0.0
 */
export * as RequestBlock from "./RequestBlock.js"

/**
 * @since 2.0.0
 */
export * as RequestResolver from "./RequestResolver.js"

/**
 * @since 2.0.0
 */
export * as Resource from "./Resource.js"

/**
 * @since 2.0.0
 */
export * as Runtime from "./Runtime.js"

/**
 * @since 2.0.0
 */
export * as RuntimeFlags from "./RuntimeFlags.js"

/**
 * @since 2.0.0
 */
export * as RuntimeFlagsPatch from "./RuntimeFlagsPatch.js"

/**
 * @since 2.0.0
 */
export * as STM from "./STM.js"

/**
 * @since 2.0.0
 */
export * as Schedule from "./Schedule.js"

/**
 * @since 2.0.0
 */
export * as ScheduleDecision from "./ScheduleDecision.js"

/**
 * @since 2.0.0
 */
export * as ScheduleInterval from "./ScheduleInterval.js"

/**
 * @since 2.0.0
 */
export * as ScheduleIntervals from "./ScheduleIntervals.js"

/**
 * @since 2.0.0
 */
export * as Scheduler from "./Scheduler.js"

/**
 * @since 2.0.0
 */
export * as Scope from "./Scope.js"

/**
 * @since 2.0.0
 */
export * as ScopedCache from "./ScopedCache.js"

/**
 * @since 2.0.0
 */
export * as ScopedRef from "./ScopedRef.js"

/**
 * @since 2.0.0
 * @deprecated
 */
export * as Secret from "./Secret.js"

/**
 * @since 2.0.0
 */
export * as SingleProducerAsyncInput from "./SingleProducerAsyncInput.js"

/**
 * @since 2.0.0
 */
export * as Sink from "./Sink.js"

/**
 * @since 2.0.0
 */
export * as SortedMap from "./SortedMap.js"

/**
 * @since 2.0.0
 */
export * as SortedSet from "./SortedSet.js"

/**
 * @since 2.0.0
 */
export * as Stream from "./Stream.js"

/**
 * @since 2.0.0
 */
export * as StreamEmit from "./StreamEmit.js"

/**
 * @since 2.0.0
 */
export * as StreamHaltStrategy from "./StreamHaltStrategy.js"

/**
 * @since 2.0.0
 */
export * as Streamable from "./Streamable.js"

/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as String from "./String.js"

/**
 * This module provides utility functions for working with structs in TypeScript.
 *
 * @since 2.0.0
 */
export * as Struct from "./Struct.js"

/**
 * @since 2.0.0
 */
export * as Subscribable from "./Subscribable.js"

/**
 * @since 2.0.0
 */
export * as SubscriptionRef from "./SubscriptionRef.js"

/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 2.0.0
 */
export * as Supervisor from "./Supervisor.js"

/**
 * @since 2.0.0
 */
export * as Symbol from "./Symbol.js"

/**
 * @since 2.0.0
 */
export * as SynchronizedRef from "./SynchronizedRef.js"

/**
 * @since 2.0.0
 */
export * as TArray from "./TArray.js"

/**
 * @since 2.0.0
 */
export * as TDeferred from "./TDeferred.js"

/**
 * @since 2.0.0
 */
export * as TMap from "./TMap.js"

/**
 * @since 2.0.0
 */
export * as TPriorityQueue from "./TPriorityQueue.js"

/**
 * @since 2.0.0
 */
export * as TPubSub from "./TPubSub.js"

/**
 * @since 2.0.0
 */
export * as TQueue from "./TQueue.js"

/**
 * @since 2.0.0
 */
export * as TRandom from "./TRandom.js"

/**
 * @since 2.0.0
 */
export * as TReentrantLock from "./TReentrantLock.js"

/**
 * @since 2.0.0
 */
export * as TRef from "./TRef.js"

/**
 * @since 2.0.0
 */
export * as TSemaphore from "./TSemaphore.js"

/**
 * @since 2.0.0
 */
export * as TSet from "./TSet.js"

/**
 * @since 2.0.0
 */
export * as Take from "./Take.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotation from "./TestAnnotation.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotationMap from "./TestAnnotationMap.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotations from "./TestAnnotations.js"

/**
 * @since 2.0.0
 */
export * as TestClock from "./TestClock.js"

/**
 * @since 2.0.0
 */
export * as TestConfig from "./TestConfig.js"

/**
 * @since 2.0.0
 */
export * as TestContext from "./TestContext.js"

/**
 * @since 2.0.0
 */
export * as TestLive from "./TestLive.js"

/**
 * @since 2.0.0
 */
export * as TestServices from "./TestServices.js"

/**
 * @since 2.0.0
 */
export * as TestSized from "./TestSized.js"

/**
 * @since 2.0.0
 */
export * as Tracer from "./Tracer.js"

/**
 * A `Trie` is used for locating specific `string` keys from within a set.
 *
 * It works similar to `HashMap`, but with keys required to be `string`.
 * This constraint unlocks some performance optimizations and new methods to get string prefixes (e.g. `keysWithPrefix`, `longestPrefixOf`).
 *
 * Prefix search is also the main feature that makes a `Trie` more suited than `HashMap` for certain usecases.
 *
 * A `Trie` is often used to store a dictionary (list of words) that can be searched
 * in a manner that allows for efficient generation of completion lists
 * (e.g. predict the rest of a word a user is typing).
 *
 * A `Trie` has O(n) lookup time where `n` is the size of the key,
 * or even less than `n` on search misses.
 *
 * @since 2.0.0
 */
export * as Trie from "./Trie.js"

/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 2.0.0
 */
export * as Tuple from "./Tuple.js"

/**
 * A collection of types that are commonly used types.
 *
 * @since 2.0.0
 */
export * as Types from "./Types.js"

/**
 * @since 2.0.0
 */
export * as Unify from "./Unify.js"

/**
 * @since 2.0.0
 */
export * as UpstreamPullRequest from "./UpstreamPullRequest.js"

/**
 * @since 2.0.0
 */
export * as UpstreamPullStrategy from "./UpstreamPullStrategy.js"

/**
 * @since 2.0.0
 */
export * as Utils from "./Utils.js"
