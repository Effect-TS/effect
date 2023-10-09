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
} from "effect/Function"

/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as BigInt from "effect/BigInt"

/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as Boolean from "effect/Boolean"

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
export * as Brand from "effect/Brand"

/**
 * @since 2.0.0
 */
export * as Cache from "effect/Cache"

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
export * as Cause from "effect/Cause"

/**
 * @since 2.0.0
 */
export * as Channel from "effect/Channel"

/**
 * @since 2.0.0
 */
export * as ChannelChildExecutorDecision from "effect/ChannelChildExecutorDecision"

/**
 * @since 2.0.0
 */
export * as ChannelMergeDecision from "effect/ChannelMergeDecision"

/**
 * @since 2.0.0
 */
export * as ChannelMergeState from "effect/ChannelMergeState"

/**
 * @since 2.0.0
 */
export * as ChannelMergeStrategy from "effect/ChannelMergeStrategy"

/**
 * @since 2.0.0
 */
export * as ChannelSingleProducerAsyncInput from "effect/ChannelSingleProducerAsyncInput"

/**
 * @since 2.0.0
 */
export * as ChannelUpstreamPullRequest from "effect/ChannelUpstreamPullRequest"

/**
 * @since 2.0.0
 */
export * as ChannelUpstreamPullStrategy from "effect/ChannelUpstreamPullStrategy"

/**
 * @since 2.0.0
 */
export * as Chunk from "effect/Chunk"

/**
 * @since 2.0.0
 */
export * as Clock from "effect/Clock"

/**
 * @since 2.0.0
 */
export * as Config from "effect/Config"

/**
 * @since 2.0.0
 */
export * as ConfigError from "effect/ConfigError"

/**
 * @since 2.0.0
 */
export * as ConfigProvider from "effect/ConfigProvider"

/**
 * @since 2.0.0
 */
export * as ConfigProviderPathPatch from "effect/ConfigProviderPathPatch"

/**
 * @since 2.0.0
 */
export * as ConfigSecret from "effect/ConfigSecret"

/**
 * @since 2.0.0
 */
export * as Console from "effect/Console"

/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
export * as Context from "effect/Context"

/**
 * @since 2.0.0
 */
export * as Data from "effect/Data"

/**
 * @since 2.0.0
 */
export * as DefaultServices from "effect/DefaultServices"

/**
 * @since 2.0.0
 */
export * as Deferred from "effect/Deferred"

/**
 * @since 2.0.0
 */
export * as Differ from "effect/Differ"

/**
 * @since 2.0.0
 */
export * as Duration from "effect/Duration"

/**
 * @since 2.0.0
 */
export * as Effect from "effect/Effect"

/**
 * @since 2.0.0
 */
export * as Effectable from "effect/Effectable"

/**
 * @since 2.0.0
 */
export * as Either from "effect/Either"

/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 2.0.0
 */
export * as Encoding from "effect/Encoding"

/**
 * @since 2.0.0
 */
export * as Equal from "effect/Equal"

/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 2.0.0
 */
export * as Equivalence from "effect/Equivalence"

/**
 * @since 2.0.0
 */
export * as ExecutionStrategy from "effect/ExecutionStrategy"

/**
 * @since 2.0.0
 */
export * as Exit from "effect/Exit"

/**
 * @since 2.0.0
 */
export * as Fiber from "effect/Fiber"

/**
 * @since 2.0.0
 */
export * as FiberId from "effect/FiberId"

/**
 * @since 2.0.0
 */
export * as FiberRef from "effect/FiberRef"

/**
 * @since 2.0.0
 */
export * as FiberRefs from "effect/FiberRefs"

/**
 * @since 2.0.0
 */
export * as FiberRefsPatch from "effect/FiberRefsPatch"

/**
 * @since 2.0.0
 */
export * as FiberStatus from "effect/FiberStatus"

/**
 * @since 2.0.0
 */
export * as Function from "effect/Function"

/**
 * @since 2.0.0
 */
export * as GlobalValue from "effect/GlobalValue"

/**
 * @since 2.0.0
 */
export * as GroupBy from "effect/GroupBy"

/**
 * @since 2.0.0
 */
export * as HKT from "effect/HKT"

/**
 * @since 2.0.0
 */
export * as Hash from "effect/Hash"

/**
 * @since 2.0.0
 */
export * as HashMap from "effect/HashMap"

/**
 * @since 2.0.0
 */
export * as HashSet from "effect/HashSet"

/**
 * @since 2.0.0
 */
export * as Inspectable from "effect/Inspectable"

/**
 * @since 2.0.0
 */
export * as KeyedPool from "effect/KeyedPool"

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
export * as Layer from "effect/Layer"

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
export * as List from "effect/List"

/**
 * @since 2.0.0
 */
export * as LogLevel from "effect/LogLevel"

/**
 * @since 2.0.0
 */
export * as LogSpan from "effect/LogSpan"

/**
 * @since 2.0.0
 */
export * as Logger from "effect/Logger"

/**
 * @since 1.0.0
 */
export * as Match from "effect/Match"

/**
 * @since 2.0.0
 */
export * as Metric from "effect/Metric"

/**
 * @since 2.0.0
 */
export * as MetricBoundaries from "effect/MetricBoundaries"

/**
 * @since 2.0.0
 */
export * as MetricHook from "effect/MetricHook"

/**
 * @since 2.0.0
 */
export * as MetricKey from "effect/MetricKey"

/**
 * @since 2.0.0
 */
export * as MetricKeyType from "effect/MetricKeyType"

/**
 * @since 2.0.0
 */
export * as MetricLabel from "effect/MetricLabel"

/**
 * @since 2.0.0
 */
export * as MetricPair from "effect/MetricPair"

/**
 * @since 2.0.0
 */
export * as MetricPolling from "effect/MetricPolling"

/**
 * @since 2.0.0
 */
export * as MetricRegistry from "effect/MetricRegistry"

/**
 * @since 2.0.0
 */
export * as MetricState from "effect/MetricState"

/**
 * @since 2.0.0
 */
export * as MutableHashMap from "effect/MutableHashMap"

/**
 * @since 2.0.0
 */
export * as MutableHashSet from "effect/MutableHashSet"

/**
 * @since 2.0.0
 */
export * as MutableList from "effect/MutableList"

/**
 * @since 2.0.0
 */
export * as MutableQueue from "effect/MutableQueue"

/**
 * @since 2.0.0
 */
export * as MutableRef from "effect/MutableRef"

/**
 * @since 2.0.0
 */
export * as NonEmptyIterable from "effect/NonEmptyIterable"

/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as Number from "effect/Number"

/**
 * @since 2.0.0
 */
export * as Option from "effect/Option"

/**
 * @since 2.0.0
 */
export * as Order from "effect/Order"

/**
 * @since 2.0.0
 */
export * as Ordering from "effect/Ordering"

/**
 * @since 2.0.0
 */
export * as Pipeable from "effect/Pipeable"

/**
 * @since 2.0.0
 */
export * as Pool from "effect/Pool"

/**
 * @since 2.0.0
 */
export * as Predicate from "effect/Predicate"

/**
 * @since 2.0.0
 */
export * as PubSub from "effect/PubSub"

/**
 * @since 2.0.0
 */
export * as Queue from "effect/Queue"

/**
 * @since 2.0.0
 */
export * as Random from "effect/Random"

/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 2.0.0
 */
export * as ReadonlyArray from "effect/ReadonlyArray"

/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */
export * as ReadonlyRecord from "effect/ReadonlyRecord"

/**
 * @since 2.0.0
 */
export * as RedBlackTree from "effect/RedBlackTree"

/**
 * @since 2.0.0
 */
export * as Ref from "effect/Ref"

/**
 * @since 2.0.0
 */
export * as Reloadable from "effect/Reloadable"

/**
 * @since 2.0.0
 */
export * as Request from "effect/Request"

/**
 * @since 2.0.0
 */
export * as RequestBlock from "effect/RequestBlock"

/**
 * @since 2.0.0
 */
export * as RequestResolver from "effect/RequestResolver"

/**
 * @since 2.0.0
 */
export * as Resource from "effect/Resource"

/**
 * @since 2.0.0
 */
export * as Runtime from "effect/Runtime"

/**
 * @since 2.0.0
 */
export * as RuntimeFlags from "effect/RuntimeFlags"

/**
 * @since 2.0.0
 */
export * as RuntimeFlagsPatch from "effect/RuntimeFlagsPatch"

/**
 * @since 2.0.0
 */
export * as STM from "effect/STM"

/**
 * @since 2.0.0
 */
export * as Schedule from "effect/Schedule"

/**
 * @since 2.0.0
 */
export * as ScheduleDecision from "effect/ScheduleDecision"

/**
 * @since 2.0.0
 */
export * as ScheduleInterval from "effect/ScheduleInterval"

/**
 * @since 2.0.0
 */
export * as ScheduleIntervals from "effect/ScheduleIntervals"

/**
 * @since 2.0.0
 */
export * as Scheduler from "effect/Scheduler"

/**
 * @since 2.0.0
 */
export * as Scope from "effect/Scope"

/**
 * @since 2.0.0
 */
export * as ScopedCache from "effect/ScopedCache"

/**
 * @since 2.0.0
 */
export * as ScopedRef from "effect/ScopedRef"

/**
 * @since 2.0.0
 */
export * as Sink from "effect/Sink"

/**
 * @since 2.0.0
 */
export * as SortedMap from "effect/SortedMap"

/**
 * @since 2.0.0
 */
export * as SortedSet from "effect/SortedSet"

/**
 * @since 2.0.0
 */
export * as Stream from "effect/Stream"

/**
 * @since 2.0.0
 */
export * as StreamEmit from "effect/StreamEmit"

/**
 * @since 2.0.0
 */
export * as StreamHaltStrategy from "effect/StreamHaltStrategy"

/**
 * @since 2.0.0
 */
export * as Streamable from "effect/Streamable"

/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as String from "effect/String"

/**
 * This module provides utility functions for working with structs in TypeScript.
 *
 * @since 2.0.0
 */
export * as Struct from "effect/Struct"

/**
 * @since 2.0.0
 */
export * as SubscriptionRef from "effect/SubscriptionRef"

/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 2.0.0
 */
export * as Supervisor from "effect/Supervisor"

/**
 * @since 2.0.0
 */
export * as Symbol from "effect/Symbol"

/**
 * @since 2.0.0
 */
export * as SynchronizedRef from "effect/SynchronizedRef"

/**
 * @since 2.0.0
 */
export * as TArray from "effect/TArray"

/**
 * @since 2.0.0
 */
export * as TDeferred from "effect/TDeferred"

/**
 * @since 2.0.0
 */
export * as TMap from "effect/TMap"

/**
 * @since 2.0.0
 */
export * as TPriorityQueue from "effect/TPriorityQueue"

/**
 * @since 2.0.0
 */
export * as TPubSub from "effect/TPubSub"

/**
 * @since 2.0.0
 */
export * as TQueue from "effect/TQueue"

/**
 * @since 2.0.0
 */
export * as TRandom from "effect/TRandom"

/**
 * @since 2.0.0
 */
export * as TReentrantLock from "effect/TReentrantLock"

/**
 * @since 2.0.0
 */
export * as TRef from "effect/TRef"

/**
 * @since 2.0.0
 */
export * as TSemaphore from "effect/TSemaphore"

/**
 * @since 2.0.0
 */
export * as TSet from "effect/TSet"

/**
 * @since 2.0.0
 */
export * as Take from "effect/Take"

/**
 * @since 2.0.0
 */
export * as TestAnnotation from "effect/TestAnnotation"

/**
 * @since 2.0.0
 */
export * as TestAnnotationMap from "effect/TestAnnotationMap"

/**
 * @since 2.0.0
 */
export * as TestAnnotations from "effect/TestAnnotations"

/**
 * @since 2.0.0
 */
export * as TestClock from "effect/TestClock"

/**
 * @since 2.0.0
 */
export * as TestConfig from "effect/TestConfig"

/**
 * @since 2.0.0
 */
export * as TestContext from "effect/TestContext"

/**
 * @since 2.0.0
 */
export * as TestLive from "effect/TestLive"

/**
 * @since 2.0.0
 */
export * as TestServices from "effect/TestServices"

/**
 * @since 2.0.0
 */
export * as TestSized from "effect/TestSized"

/**
 * @since 2.0.0
 */
export * as Tracer from "effect/Tracer"

/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 2.0.0
 */
export * as Tuple from "effect/Tuple"

/**
 * A collection of types that are commonly used types.
 *
 * @since 2.0.0
 */
export * as Types from "effect/Types"

/**
 * @since 2.0.0
 */
export * as Unify from "effect/Unify"

/**
 * @since 2.0.0
 */
export * as Utils from "effect/Utils"
