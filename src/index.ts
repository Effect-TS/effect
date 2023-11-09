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
 * @since 2.0.0
 * @category models
 */
export { BigDecimal } from "./BigDecimal.js"


export { BigInt } from "./BigInt.js"


export { Boolean } from "./Boolean.js"

/**
 * A generic interface that defines a branded type.
 *
 * @since 2.0.0
 * @category models
 */
export { Brand } from "./Brand.js"

/**
 * A `Cache` is defined in terms of a lookup function that, given a key of
 * type `Key`, can either fail with an error of type `Error` or succeed with a
 * value of type `Value`. Getting a value from the cache will either return
 * the previous result of the lookup function if it is available or else
 * compute a new result with the lookup function, put it in the cache, and
 * return it.
 *
 * A cache also has a specified capacity and time to live. When the cache is
 * at capacity the least recently accessed values in the cache will be
 * removed to make room for new values. Getting a value with a life older than
 * the specified time to live will result in a new value being computed with
 * the lookup function and returned when available.
 *
 * The cache is safe for concurrent access. If multiple fibers attempt to get
 * the same key the lookup function will only be computed once and the result
 * will be returned to all fibers.
 *
 * @since 2.0.0
 * @category models
 */
export { Cache } from "./Cache.js"

/**
 * A `Cause` represents the full history of a failure resulting from running an
 * `Effect` workflow.
 *
 * Effect-TS uses a data structure from functional programming called a semiring
 * to represent the `Cause` data type. This allows us to take a base type `E`
 * (which represents the error type of an `Effect`) and capture the sequential
 * and parallel composition of errors in a fully lossless fashion.
 *
 * @since 2.0.0
 * @category models
 */
export { Cause } from "./Cause.js"

/**
 * A `Channel` is a nexus of I/O operations, which supports both reading and
 * writing. A channel may read values of type `InElem` and write values of type
 * `OutElem`. When the channel finishes, it yields a value of type `OutDone`. A
 * channel may fail with a value of type `OutErr`.
 *
 * Channels are the foundation of Streams: both streams and sinks are built on
 * channels. Most users shouldn't have to use channels directly, as streams and
 * sinks are much more convenient and cover all common use cases. However, when
 * adding new stream and sink operators, or doing something highly specialized,
 * it may be useful to use channels directly.
 *
 * Channels compose in a variety of ways:
 *
 *  - **Piping**: One channel can be piped to another channel, assuming the
 *    input type of the second is the same as the output type of the first.
 *  - **Sequencing**: The terminal value of one channel can be used to create
 *    another channel, and both the first channel and the function that makes
 *    the second channel can be composed into a channel.
 *  - **Concatenating**: The output of one channel can be used to create other
 *    channels, which are all concatenated together. The first channel and the
 *    function that makes the other channels can be composed into a channel.
 *
 * @since 2.0.0
 * @category models
 */
export { Channel } from "./Channel.js"

/**
 * @since 2.0.0
 * @category models
 */
export { ChildExecutorDecision } from "./ChildExecutorDecision.js"

/**
 * @category models
 * @since 2.0.0
 */
export { Chunk } from "./Chunk.js"

/**
 * Represents a time-based clock which provides functionality related to time
 * and scheduling.
 *
 * @since 2.0.0
 * @category models
 */
export { Clock } from "./Clock.js"

/**
 * A `Config` describes the structure of some configuration data.
 *
 * @since 2.0.0
 * @category models
 */
export { Config } from "./Config.js"

/**
 * The possible ways that loading configuration data may fail.
 *
 * @since 2.0.0
 * @category models
 */
export { ConfigError } from "./ConfigError.js"

/**
 * A ConfigProvider is a service that provides configuration given a description
 * of the structure of that configuration.
 *
 * @since 2.0.0
 * @category models
 */
export { ConfigProvider } from "./ConfigProvider.js"

/**
 * Represents a description of how to modify the path to a configuration
 * value.
 *
 * @since 2.0.0
 * @category models
 */
export { ConfigProviderPathPatch } from "./ConfigProviderPathPatch.js"

/**
 * @since 2.0.0
 * @category models
 */
export { ConfigSecret } from "./ConfigSecret.js"

/**
 * @since 2.0.0
 * @category model
 */
export { Console } from "./Console.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Context } from "./Context.js"

/**
 * @category models
 * @since 2.0.0
 */
export { Data } from "./Data.js"

/**
/**
 * @since 2.0.0
 * @category models
 */
export { DefaultServices } from "./DefaultServices.js"

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `Deferred.await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @since 2.0.0
 * @category models
 */
export { Deferred } from "./Deferred.js"

/**
 * A `Differ<Value, Patch>` knows how to compare an old value and new value of
 * type `Value` to produce a patch of type `Patch` that describes the
 * differences between those values. A `Differ` also knows how to apply a patch
 * to an old value to produce a new value that represents the old value updated
 * with the changes described by the patch.
 *
 * A `Differ` can be used to construct a `FiberRef` supporting compositional
 * updates using the `FiberRef.makePatch` constructor.
 *
 * The `Differ` companion object contains constructors for `Differ` values for
 * common data types such as `Chunk`, `HashMap`, and `HashSet``. In addition,
 * `Differ`values can be transformed using the `transform` operator and combined
 * using the `orElseEither` and `zip` operators. This allows creating `Differ`
 * values for arbitrarily complex data types compositionally.
 *
 * @since 2.0.0
 * @category models
 */
export { Differ } from "./Differ.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Duration } from "./Duration.js"

/**
 * The `Effect` interface defines a value that lazily describes a workflow or job.
 * The workflow requires some context `R`, and may fail with an error of type `E`,
 * or succeed with a value of type `A`.
 *
 * `Effect` values model resourceful interaction with the outside world, including
 * synchronous, asynchronous, concurrent, and parallel interaction. They use a
 * fiber-based concurrency model, with built-in support for scheduling, fine-grained
 * interruption, structured concurrency, and high scalability.
 *
 * To run an `Effect` value, you need a `Runtime`, which is a type that is capable
 * of executing `Effect` values.
 *
 * @since 2.0.0
 * @category models
 */
export { Effect } from "./Effect.js"


export { Effectable } from "./Effectable.js"

/**
 * @category models
 * @since 2.0.0
 */
export { Either } from "./Either.js"


export { Encoding } from "./Encoding.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Equal } from "./Equal.js"

/**
 * @category type class
 * @since 2.0.0
 */
export { Equivalence } from "./Equivalence.js"

/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel.
 *
 * There are 3 possible execution strategies: `Sequential`, `Parallel`,
 * `ParallelN`.
 *
 * @since 2.0.0
 * @category models
 */
export { ExecutionStrategy } from "./ExecutionStrategy.js"

/**
 * An `Exit<E, A>` describes the result of a executing an `Effect` workflow.
 *
 * There are two possible values for an `Exit<E, A>`:
 *   - `Exit.Success` contain a success value of type `A`
 *   - `Exit.Failure` contains a failure `Cause` of type `E`
 *
 * @since 2.0.0
 * @category models
 */
export { Exit } from "./Exit.js"

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 *
 * @since 2.0.0
 * @category models
 */
export { Fiber } from "./Fiber.js"

/**
 * @since 2.0.0
 * @category models
 */
export { FiberId } from "./FiberId.js"

/**
 * @since 2.0.0
 * @category model
 */
export { FiberRef } from "./FiberRef.js"

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 *
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @since 2.0.0
 * @category models
 */
export { FiberRefs } from "./FiberRefs.js"

/**
 * A `FiberRefsPatch` captures the changes in `FiberRef` values made by a single
 * fiber as a value. This allows fibers to apply the changes made by a workflow
 * without inheriting all the `FiberRef` values of the fiber that executed the
 * workflow.
 *
 * @since 2.0.0
 * @category models
 */
export { FiberRefsPatch } from "./FiberRefsPatch.js"

/**
 * @since 2.0.0
 * @category models
 */
export { FiberStatus } from "./FiberStatus.js"


export { Function } from "./Function.js"


export { GlobalValue } from "./GlobalValue.js"

/**
 * Representation of a grouped stream. This allows to filter which groups will
 * be processed. Once this is applied all groups will be processed in parallel
 * and the results will be merged in arbitrary order.
 *
 * @since 2.0.0
 * @category models
 */
export { GroupBy } from "./GroupBy.js"


export { HKT } from "./HKT.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Hash } from "./Hash.js"

/**
 * @since 2.0.0
 * @category models
 */
export { HashMap } from "./HashMap.js"

/**
 * @since 2.0.0
 * @category models
 */
export { HashSet } from "./HashSet.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Inspectable } from "./Inspectable.js"

/**
 * A `KeyedPool<K, E, A>` is a pool of `Pool`s of items of type `A`. Each pool
 * in the `KeyedPool` is associated with a key of type `K`.
 *
 * @since 2.0.0
 * @category models
 */
export { KeyedPool } from "./KeyedPool.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Layer } from "./Layer.js"

/**
 * Represents an immutable linked list of elements of type `A`.
 *
 * A `List` is optimal for last-in-first-out (LIFO), stack-like access patterns.
 * If you need another access pattern, for example, random access or FIFO,
 * consider using a collection more suited for that other than `List`.
 *
 * @since 2.0.0
 * @category models
 */
export { List } from "./List.js"

/**
 * A `LogLevel` represents the log level associated with an individual logging
 * operation. Log levels are used both to describe the granularity (or
 * importance) of individual log statements, as well as to enable tuning
 * verbosity of log output.
 *
 * @since 2.0.0
 * @category model
 * @property ordinal - The priority of the log message. Larger values indicate higher priority.
 * @property label - A label associated with the log level.
 * @property syslog -The syslog severity level of the log level.
 */
export { LogLevel } from "./LogLevel.js"

/**
 * @since 2.0.0
 * @category models
 */
export { LogSpan } from "./LogSpan.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Logger } from "./Logger.js"


export { Match } from "./Match.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MergeDecision } from "./MergeDecision.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MergeState } from "./MergeState.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MergeStrategy } from "./MergeStrategy.js"

/**
 * A `Metric<Type, In, Out>` represents a concurrent metric which accepts
 * updates of type `In` and are aggregated to a stateful value of type `Out`.
 *
 * For example, a counter metric would have type `Metric<number, number>`,
 * representing the fact that the metric can be updated with numbers (the amount
 * to increment or decrement the counter by), and the state of the counter is a
 * number.
 *
 * There are five primitive metric types supported by Effect:
 *
 *   - Counters
 *   - Frequencies
 *   - Gauges
 *   - Histograms
 *   - Summaries
 *
 * @since 2.0.0
 * @category models
 */
export { Metric } from "./Metric.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MetricBoundaries } from "./MetricBoundaries.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MetricHook } from "./MetricHook.js"

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and tags associated with the
 * metric, an optional description of the key, and any other information to
 * describe a metric, such as the boundaries of a histogram. In this way, it is
 * impossible to ever create different metrics with conflicting keys.
 *
 * @since 2.0.0
 * @category models
 */
export { MetricKey } from "./MetricKey.js"

/**
 * @since 2.0.0
 * @category modelz
 */
export { MetricKeyType } from "./MetricKeyType.js"

/**
 * A `MetricLabel` represents a key value pair that allows analyzing metrics at
 * an additional level of granularity.
 *
 * For example if a metric tracks the response time of a service labels could
 * be used to create separate versions that track response times for different
 * clients.
 *
 * @since 2.0.0
 * @category models
 */
export { MetricLabel } from "./MetricLabel.js"

/**
 * @since 2.0.0
 * @category model
 */
export { MetricPair } from "./MetricPair.js"

/**
 * A `MetricPolling` is a combination of a metric and an effect that polls for
 * updates to the metric.
 *
 * @since 2.0.0
 * @category models
 */
export { MetricPolling } from "./MetricPolling.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MetricRegistry } from "./MetricRegistry.js"

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricStateType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @since 2.0.0
 * @category models
 */
export { MetricState } from "./MetricState.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MutableHashMap } from "./MutableHashMap.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MutableHashSet } from "./MutableHashSet.js"

/**
 * @since 2.0.0
 * @category model
 */
export { MutableList } from "./MutableList.js"

/**
 * @since 2.0.0
 * @category model
 */
export { MutableQueue } from "./MutableQueue.js"

/**
 * @since 2.0.0
 * @category models
 */
export { MutableRef } from "./MutableRef.js"

/**
 * @category model
 * @since 2.0.0
 */
export { NonEmptyIterable } from "./NonEmptyIterable.js"


export { Number } from "./Number.js"

/**
 * @category models
 * @since 2.0.0
 */
export { Option } from "./Option.js"

/**
 * @category type class
 * @since 2.0.0
 */
export { Order } from "./Order.js"

/**
 * @category model
 * @since 2.0.0
 */
export { Ordering } from "./Ordering.js"

/**
 * @since 2.0.0
 */
export { Pipeable } from "./Pipeable.js"

/**
 * A `Pool<E, A>` is a pool of items of type `A`, each of which may be
 * associated with the acquisition and release of resources. An attempt to get
 * an item `A` from a pool may fail with an error of type `E`.
 *
 * @since 2.0.0
 * @category models
 */
export { Pool } from "./Pool.js"

/**
 * @category models
 * @since 2.0.0
 */
export { Predicate } from "./Predicate.js"

/**
 * A `PubSub<A>` is an asynchronous message hub into which publishers can publish
 * messages of type `A` and subscribers can subscribe to take messages of type
 * `A`.
 *
 * @since 2.0.0
 * @category models
 */
export { PubSub } from "./PubSub.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Queue } from "./Queue.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Random } from "./Random.js"

/**
 * @since 2.0.0
 */
export { ReadonlyArray } from "./ReadonlyArray.js"

/**
 * @category models
 * @since 2.0.0
 */
export { ReadonlyRecord } from "./ReadonlyRecord.js"

/**
 * A Red-Black Tree.
 *
 * @since 2.0.0
 * @category models
 */
export { RedBlackTree } from "./RedBlackTree.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Ref } from "./Ref.js"

/**
 * A `Reloadable` is an implementation of some service that can be dynamically
 * reloaded, or swapped out for another implementation on-the-fly.
 *
 * @since 2.0.0
 * @category models
 */
export { Reloadable } from "./Reloadable.js"

/**
 * A `Request<E, A>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @since 2.0.0
 * @category models
 */
export { Request } from "./Request.js"

/**
 * `RequestBlock` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 *
 * @since 2.0.0
 * @category models
 */
export { RequestBlock } from "./RequestBlock.js"

/**
 * A `RequestResolver<A, R>` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `RequestCompletionMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request<A>`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request<A>`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `RequestCompletionMap` using
 * `RequestCompletionMap.empty` and `RequestCompletionMap.insert`. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 *
 * @since 2.0.0
 * @category models
 */
export { RequestResolver } from "./RequestResolver.js"

/**
 * A `Resource` is a possibly resourceful value that is loaded into memory, and
 * which can be refreshed either manually or automatically.
 *
 * @since 2.0.0
 * @category models
 */
export { Resource } from "./Resource.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Runtime } from "./Runtime.js"

/**
 * Represents a set of `RuntimeFlag`s. `RuntimeFlag`s affect the operation of
 * the Effect runtime system. They are exposed to application-level code because
 * they affect the behavior and performance of application code.
 *
 * @since 2.0.0
 * @category models
 */
export { RuntimeFlags } from "./RuntimeFlags.js"

/**
 * @since 2.0.0
 * @category models
 */
export { RuntimeFlagsPatch } from "./RuntimeFlagsPatch.js"

/**
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of
 * arbitrary atomic operations.  It is the software analog of transactions in
 * database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM
 * although the implementation does not resemble the Haskell one at all.
 *
 * See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html
 *
 * STM in Haskell was introduced in:
 *
 * Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
 * Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
 * Parallel Programming 2005.
 *
 * See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 *  Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 *  International Symposium on Functional and Logic Programming, Fuji Susono,
 *  JAPAN, April 2006
 *
 *  https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/
 *
 * The implemtation is based on the ZIO STM module, while JS environments have
 * no race conditions from multiple threads STM provides greater benefits for
 * synchronization of Fibers and transactional data-types can be quite useful.
 *
 * @since 2.0.0
 * @category models
 */
export { STM } from "./STM.js"

/**
 * A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
 * values of type `In`, and which returns values of type `Out`.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over
 * time. Each interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of
 * each interval produced by a schedule is used as the moment when the effect
 * will be executed again.
 *
 * Schedules compose in the following primary ways:
 *
 * - Union: performs the union of the intervals of two schedules
 * - Intersection: performs the intersection of the intervals of two schedules
 * - Sequence: concatenates the intervals of one schedule onto another
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to
 * terminate a schedule early in response to some input or output), and so
 * forth.
 *
 * A variety of other operators exist for transforming and combining schedules,
 * and the companion object for `Schedule` contains all common types of
 * schedules, both for performing retrying, as well as performing repetition.
 *
 * @category model
 * @since 2.0.0
 */
export { Schedule } from "./Schedule.js"

/**
 * @since 2.0.0
 * @category models
 */
export { ScheduleDecision } from "./ScheduleDecision.js"

/**
 * An `ScheduleInterval` represents an interval of time. ScheduleIntervals can encompass all
 * time, or no time at all.
 *
 * @since 2.0.0
 * @category models
 */
export { ScheduleInterval } from "./ScheduleInterval.js"

/**
 * An `ScheduleIntervals` represents a list of several `ScheduleInterval`s.
 *
 * @since 2.0.0
 * @category models
 */
export { ScheduleIntervals } from "./ScheduleIntervals.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Scheduler } from "./Scheduler.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Scope } from "./Scope.js"

/**
 * @since 2.0.0
 * @category models
 */
export { ScopedCache } from "./ScopedCache.js"

/**
 * A `ScopedRef` is a reference whose value is associated with resources,
 * which must be released properly. You can both get the current value of any
 * `ScopedRef`, as well as set it to a new value (which may require new
 * resources). The reference itself takes care of properly releasing resources
 * for the old value whenever a new value is obtained.
 *
 * @since 2.0.0
 * @category models
 */
export { ScopedRef } from "./ScopedRef.js"

/**
 * An MVar-like abstraction for sending data to channels asynchronously which is
 * designed for one producer and multiple consumers.
 *
 * Features the following semantics:
 *   - Buffer of size 1.
 *   - When emitting, the producer waits for a consumer to pick up the value to
 *     prevent "reading ahead" too much.
 *   - Once an emitted element is read by a consumer, it is cleared from the
 *     buffer, so that at most one consumer sees every emitted element.
 *   - When sending a done or error signal, the producer does not wait for a
 *     consumer to pick up the signal. The signal stays in the buffer after
 *     being read by a consumer, so it can be propagated to multiple consumers.
 *   - Trying to publish another emit/error/done after an error/done have
 *     already been published results in an interruption.
 *
 * @since 2.0.0
 * @category models
 */
export { SingleProducerAsyncInput } from "./SingleProducerAsyncInput.js"

/**
 * A `Sink<R, E, In, L, Z>` is used to consume elements produced by a `Stream`.
 * You can think of a sink as a function that will consume a variable amount of
 * `In` elements (could be 0, 1, or many), might fail with an error of type `E`,
 * and will eventually yield a value of type `Z` together with a remainder of
 * type `L` (i.e. any leftovers).
 *
 * @since 2.0.0
 * @category models
 */
export { Sink } from "./Sink.js"

/**
 * @since 2.0.0
 * @category models
 */
export { SortedMap } from "./SortedMap.js"

/**
 * @since 2.0.0
 * @category models
 */
export { SortedSet } from "./SortedSet.js"

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated, may
 * emit zero or more values of type `A`, may fail with errors of type `E`, and
 * uses an context of type `R`. One way to think of `Stream` is as a
 * `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage
 * buffers between operators. As an optimization, `Stream` does not emit
 * single values, but rather an array of values. This allows the cost of effect
 * evaluation to be amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with
 * some adjustments for the multiple-valued nature of `Stream`). These aspects
 * allow for rich and expressive composition of streams.
 *
 * @since 2.0.0
 * @category models
 */
export { Stream } from "./Stream.js"

/**
 * An `Emit<R, E, A, B>` represents an asynchronous callback that can be
 * called multiple times. The callback can be called with a value of type
 * `Effect<R, Option<E>, Chunk<A>>`, where succeeding with a `Chunk<A>`
 * indicates to emit those elements, failing with `Some<E>` indicates to
 * terminate with that error, and failing with `None` indicates to terminate
 * with an end of stream signal.
 *
 * @since 2.0.0
 * @category models
 */
export { StreamEmit } from "./StreamEmit.js"

/**
 * @since 2.0.0
 * @category models
 */
export { StreamHaltStrategy } from "./StreamHaltStrategy.js"


export { Streamable } from "./Streamable.js"


export { String } from "./String.js"


export { Struct } from "./Struct.js"

/**
 * A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
 * receive the current value as well as all changes to the value.
 *
 * @since 2.0.0
 * @category models
 */
export { SubscriptionRef } from "./SubscriptionRef.js"

/**
 * @since 2.0.0
 * @category models
 */
export { Supervisor } from "./Supervisor.js"


export { Symbol } from "./Symbol.js"

/**
 * @since 2.0.0
 * @category models
 */
export { SynchronizedRef } from "./SynchronizedRef.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TArray } from "./TArray.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TDeferred } from "./TDeferred.js"

/**
 * Transactional map implemented on top of `TRef` and `TArray`. Resolves
 * conflicts via chaining.
 *
 * @since 2.0.0
 * @category models
 */
export { TMap } from "./TMap.js"

/**
 * A `TPriorityQueue` contains values of type `A` that an `Order` is defined
 * on. Unlike a `TQueue`, `take` returns the highest priority value (the value
 * that is first in the specified ordering) as opposed to the first value
 * offered to the queue. The ordering that elements with the same priority will
 * be taken from the queue is not guaranteed.
 *
 * @since 2.0.0
 * @category models
 */
export { TPriorityQueue } from "./TPriorityQueue.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TPubSub } from "./TPubSub.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TQueue } from "./TQueue.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TRandom } from "./TRandom.js"

/**
 * A `TReentrantLock` is a reentrant read/write lock. Multiple readers may all
 * concurrently acquire read locks. Only one writer is allowed to acquire a
 * write lock at any given time. Read locks may be upgraded into write locks. A
 * fiber that has a write lock may acquire other write locks or read locks.
 *
 * The two primary methods of this structure are `readLock`, which acquires a
 * read lock in a scoped context, and `writeLock`, which acquires a write lock
 * in a scoped context.
 *
 * Although located in the STM package, there is no need for locks within STM
 * transactions. However, this lock can be quite useful in effectful code, to
 * provide consistent read/write access to mutable state; and being in STM
 * allows this structure to be composed into more complicated concurrent
 * structures that are consumed from effectful code.
 *
 * @since 2.0.0
 * @category models
 */
export { TReentrantLock } from "./TReentrantLock.js"

/**
 * A `TRef<A>` is a purely functional description of a mutable reference that can
 * be modified as part of a transactional effect. The fundamental operations of
 * a `TRef` are `set` and `get`. `set` transactionally sets the reference to a
 * new value. `get` gets the current value of the reference.
 *
 * NOTE: While `TRef<A>` provides the transactional equivalent of a mutable
 * reference, the value inside the `TRef` should be immutable.
 *
 * @since 2.0.0
 * @category models
 */
export { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 * @category models
 */
export { TSemaphore } from "./TSemaphore.js"

/**
 * Transactional set implemented on top of `TMap`.
 *
 * @since 2.0.0
 * @category models
 */
export { TSet } from "./TSet.js"

/**
 * A `Take<E, A>` represents a single `take` from a queue modeling a stream of
 * values. A `Take` may be a failure cause `Cause<E>`, a chunk value `Chunk<A>`,
 * or an end-of-stream marker.
 *
 * @since 2.0.0
 * @category models
 */
export { Take } from "./Take.js"

/**
 * @since 2.0.0
 */
export { TestAnnotation } from "./TestAnnotation.js"

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @since 2.0.0
 */
export { TestAnnotationMap } from "./TestAnnotationMap.js"

/**
 * The `Annotations` trait provides access to an annotation map that tests can
 * add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 *
 * @since 2.0.0
 */
export { TestAnnotations } from "./TestAnnotations.js"

/**
 * A `TestClock` makes it easy to deterministically and efficiently test effects
 * involving the passage of time.
 *
 * Instead of waiting for actual time to pass, `sleep` and methods implemented
 * in terms of it schedule effects to take place at a given clock time. Users
 * can adjust the clock time using the `adjust` and `setTime` methods, and all
 * effects scheduled to take place on or before that time will automatically be
 * run in order.
 *
 * For example, here is how we can test `Effect.timeout` using `TestClock`:
 *
 * ```ts
 * import { Duration } from "effect/Duration"
 * import { Effect } from "effect/Effect"
 * import { Fiber } from "effect/Fiber"
 * import { TestClock } from "effect/TestClock"
 * import { Option } from "effect/Option"
 *
 * Effect.gen(function*() {
 *   const fiber = yield* pipe(
 *     Effect.sleep(Duration.minutes(5)),
 *     Effect.timeout(Duration.minutes(1)),
 *     Effect.fork
 *   )
 *   yield* TestClock.adjust(Duration.minutes(1))
 *   const result = yield* Fiber.join(fiber)
 *   assert.deepStrictEqual(result, Option.none())
 * })
 * ```
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set to
 * on or after the time they are scheduled to run. If we didn't fork the fiber
 * on which we called sleep we would never get to set the time on the line
 * below. Thus, a useful pattern when using `TestClock` is to fork the effect
 * being tested, then adjust the clock time, and finally verify that the
 * expected effects have been performed.
 *
 * @since 2.0.0
 */
export { TestClock } from "./TestClock.js"

/**
 * The `TestConfig` service provides access to default configuration settings
 * used by tests, including the number of times to repeat tests to ensure
 * they are stable, the number of times to retry flaky tests, the sufficient
 * number of samples to check from a random variable, and the maximum number of
 * shrinkings to minimize large failures.
 *
 * @since 2.0.0
 */
export { TestConfig } from "./TestConfig.js"


export { TestContext } from "./TestContext.js"

/**
 * The `Live` trait provides access to the "live" default Effect services from
 * within tests for workflows such as printing test results to the console or
 * timing out tests where it is necessary to access the real implementations of
 * these services.
 *
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


export { Tuple } from "./Tuple.js"


export { Types } from "./Types.js"

/**
 * @since 2.0.0
 */
export { Unify } from "./Unify.js"

/**
 * @since 2.0.0
 * @category models
 */
export { UpstreamPullRequest } from "./UpstreamPullRequest.js"

/**
 * @since 2.0.0
 * @category models
 */
export { UpstreamPullStrategy } from "./UpstreamPullStrategy.js"


export { Utils } from "./Utils.js"
