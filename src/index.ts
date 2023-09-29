/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence`, `Order`, `Semigroup`, and `Monoid`.
 *
 * @since 1.0.0
 */
export * as Bigint from "./Bigint"

/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence`, `Order`, `Semigroup`, and `Monoid`.
 *
 * @since 1.0.0
 */
export * as Boolean from "./Boolean"

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
 * @since 1.0.0
 */
export * as Brand from "./Brand"

/**
 * @since 1.0.0
 */
export * as Cache from "./Cache"

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
 * @since 1.0.0
 */
export * as Cause from "./Cause"

/**
 * @since 1.0.0
 */
export * as Channel from "./Channel"

/**
 * @since 1.0.0
 */
export * as ChannelChildExecutorDecision from "./ChannelChildExecutorDecision"

/**
 * @since 1.0.0
 */
export * as ChannelMergeDecision from "./ChannelMergeDecision"

/**
 * @since 1.0.0
 */
export * as ChannelMergeState from "./ChannelMergeState"

/**
 * @since 1.0.0
 */
export * as ChannelMergeStrategy from "./ChannelMergeStrategy"

/**
 * @since 1.0.0
 */
export * as ChannelSingleProducerAsyncInput from "./ChannelSingleProducerAsyncInput"

/**
 * @since 1.0.0
 */
export * as ChannelUpstreamPullRequest from "./ChannelUpstreamPullRequest"

/**
 * @since 1.0.0
 */
export * as ChannelUpstreamPullStrategy from "./ChannelUpstreamPullStrategy"

/**
 * @since 1.0.0
 */
export * as Chunk from "./Chunk"

/**
 * @since 1.0.0
 */
export * as Clock from "./Clock"

/**
 * @since 1.0.0
 */
export * as Config from "./Config"

/**
 * @since 1.0.0
 */
export * as ConfigError from "./ConfigError"

/**
 * @since 1.0.0
 */
export * as ConfigProvider from "./ConfigProvider"

/**
 * @since 1.0.0
 */
export * as ConfigProviderPathPatch from "./ConfigProviderPathPatch"

/**
 * @since 1.0.0
 */
export * as ConfigSecret from "./ConfigSecret"

/**
 * @since 1.0.0
 */
export * as Console from "./Console"

/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 1.0.0
 */
export * as Context from "./Context"

/**
 * @since 1.0.0
 */
export * as Data from "./Data"

/**
 * @since 1.0.0
 */
export * as DefaultServices from "./DefaultServices"

/**
 * @since 1.0.0
 */
export * as Deferred from "./Deferred"

/**
 * @since 1.0.0
 */
export * as Differ from "./Differ"

/**
 * @since 1.0.0
 */
export * as Duration from "./Duration"

/**
 * @since 1.0.0
 */
export * as Effect from "./Effect"

/**
 * @since 1.0.0
 */
export * as Effectable from "./Effectable"

/**
 * @since 1.0.0
 */
export * as Either from "./Either"

/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 1.0.0
 */
export * as Encoding from "./Encoding"

/**
 * @since 1.0.0
 */
export * as Equal from "./Equal"

/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 1.0.0
 */
export * as Equivalence from "./Equivalence"

/**
 * @since 1.0.0
 */
export * as Error from "./Error"

/**
 * @since 1.0.0
 */
export * as ExecutionStrategy from "./ExecutionStrategy"

/**
 * @since 1.0.0
 */
export * as Exit from "./Exit"

/**
 * @since 1.0.0
 */
export * as Fiber from "./Fiber"

/**
 * @since 1.0.0
 */
export * as FiberId from "./FiberId"

/**
 * @since 1.0.0
 */
export * as FiberRef from "./FiberRef"

/**
 * @since 1.0.0
 */
export * as FiberRefs from "./FiberRefs"

/**
 * @since 1.0.0
 */
export * as FiberRefsPatch from "./FiberRefsPatch"

/**
 * @since 1.0.0
 */
export * as FiberStatus from "./FiberStatus"

/**
 * @since 1.0.0
 */
export * as Function from "./Function"

/**
 * @since 1.0.0
 */
export * as GlobalValue from "./GlobalValue"

/**
 * @since 1.0.0
 */
export * as GroupBy from "./GroupBy"

/**
 * @since 1.0.0
 */
export * as HKT from "./HKT"

/**
 * @since 1.0.0
 */
export * as Hash from "./Hash"

/**
 * @since 1.0.0
 */
export * as HashMap from "./HashMap"

/**
 * @since 1.0.0
 */
export * as HashSet from "./HashSet"

/**
 * @since 1.0.0
 */
export * as Hub from "./Hub"

/**
 * @since 1.0.0
 */
export * as Inspectable from "./Inspectable"

/**
 * @since 1.0.0
 */
export * as KeyedPool from "./KeyedPool"

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
 * @since 1.0.0
 */
export * as Layer from "./Layer"

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
 * @since 1.0.0
 */
export * as List from "./List"

/**
 * @since 1.0.0
 */
export * as LogLevel from "./LogLevel"

/**
 * @since 1.0.0
 */
export * as LogSpan from "./LogSpan"

/**
 * @since 1.0.0
 */
export * as Logger from "./Logger"

/**
 * @since 1.0.0
 */
export * as Metric from "./Metric"

/**
 * @since 1.0.0
 */
export * as MetricBoundaries from "./MetricBoundaries"

/**
 * @since 1.0.0
 */
export * as MetricHook from "./MetricHook"

/**
 * @since 1.0.0
 */
export * as MetricKey from "./MetricKey"

/**
 * @since 1.0.0
 */
export * as MetricKeyType from "./MetricKeyType"

/**
 * @since 1.0.0
 */
export * as MetricLabel from "./MetricLabel"

/**
 * @since 1.0.0
 */
export * as MetricPair from "./MetricPair"

/**
 * @since 1.0.0
 */
export * as MetricPolling from "./MetricPolling"

/**
 * @since 1.0.0
 */
export * as MetricRegistry from "./MetricRegistry"

/**
 * @since 1.0.0
 */
export * as MetricState from "./MetricState"

/**
 * @since 1.0.0
 */
export * as MutableHashMap from "./MutableHashMap"

/**
 * @since 1.0.0
 */
export * as MutableHashSet from "./MutableHashSet"

/**
 * @since 1.0.0
 */
export * as MutableList from "./MutableList"

/**
 * @since 1.0.0
 */
export * as MutableQueue from "./MutableQueue"

/**
 * @since 1.0.0
 */
export * as MutableRef from "./MutableRef"

/**
 * @since 1.0.0
 */
export * as NonEmptyIterable from "./NonEmptyIterable"

/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence`, `Order`, `Semigroup`, and `Monoid`.
 *
 * @since 1.0.0
 */
export * as Number from "./Number"

/**
 * @since 1.0.0
 */
export * as Option from "./Option"

/**
 * @since 1.0.0
 */
export * as Order from "./Order"

/**
 * @since 1.0.0
 */
export * as Ordering from "./Ordering"

/**
 * @since 1.0.0
 */
export * as Pipeable from "./Pipeable"

/**
 * @since 1.0.0
 */
export * as Pool from "./Pool"

/**
 * @since 1.0.0
 */
export * as Predicate from "./Predicate"

/**
 * @since 1.0.0
 */
export * as Queue from "./Queue"

/**
 * @since 1.0.0
 */
export * as Random from "./Random"

/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 1.0.0
 */
export * as ReadonlyArray from "./ReadonlyArray"

/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 1.0.0
 */
export * as ReadonlyRecord from "./ReadonlyRecord"

/**
 * @since 1.0.0
 */
export * as RedBlackTree from "./RedBlackTree"

/**
 * @since 1.0.0
 */
export * as Ref from "./Ref"

/**
 * @since 1.0.0
 */
export * as Reloadable from "./Reloadable"

/**
 * @since 1.0.0
 */
export * as Request from "./Request"

/**
 * @since 1.0.0
 */
export * as RequestBlock from "./RequestBlock"

/**
 * @since 1.0.0
 */
export * as RequestResolver from "./RequestResolver"

/**
 * @since 1.0.0
 */
export * as Resource from "./Resource"

/**
 * @since 1.0.0
 */
export * as Runtime from "./Runtime"

/**
 * @since 1.0.0
 */
export * as RuntimeFlags from "./RuntimeFlags"

/**
 * @since 1.0.0
 */
export * as RuntimeFlagsPatch from "./RuntimeFlagsPatch"

/**
 * @since 1.0.0
 */
export * as STM from "./STM"

/**
 * @since 1.0.0
 */
export * as Schedule from "./Schedule"

/**
 * @since 1.0.0
 */
export * as ScheduleDecision from "./ScheduleDecision"

/**
 * @since 1.0.0
 */
export * as ScheduleInterval from "./ScheduleInterval"

/**
 * @since 1.0.0
 */
export * as ScheduleIntervals from "./ScheduleIntervals"

/**
 * @since 1.0.0
 */
export * as Scheduler from "./Scheduler"

/**
 * @since 1.0.0
 */
export * as Scope from "./Scope"

/**
 * @since 1.0.0
 */
export * as ScopedCache from "./ScopedCache"

/**
 * @since 1.0.0
 */
export * as ScopedRef from "./ScopedRef"

/**
 * @since 1.0.0
 */
export * as Sink from "./Sink"

/**
 * @since 1.0.0
 */
export * as SortedMap from "./SortedMap"

/**
 * @since 1.0.0
 */
export * as SortedSet from "./SortedSet"

/**
 * @since 1.0.0
 */
export * as Stream from "./Stream"

/**
 * @since 1.0.0
 */
export * as StreamEmit from "./StreamEmit"

/**
 * @since 1.0.0
 */
export * as StreamHaltStrategy from "./StreamHaltStrategy"

/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence`, `Order`, `Semigroup`, and `Monoid`.
 *
 * @since 1.0.0
 */
export * as String from "./String"

/**
 * This module provides utility functions for working with structs in TypeScript.
 *
 * @since 1.0.0
 */
export * as Struct from "./Struct"

/**
 * @since 1.0.0
 */
export * as SubscriptionRef from "./SubscriptionRef"

/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 1.0.0
 */
export * as Supervisor from "./Supervisor"

/**
 * @since 1.0.0
 */
export * as Symbol from "./Symbol"

/**
 * @since 1.0.0
 */
export * as SynchronizedRef from "./SynchronizedRef"

/**
 * @since 1.0.0
 */
export * as TArray from "./TArray"

/**
 * @since 1.0.0
 */
export * as TDeferred from "./TDeferred"

/**
 * @since 1.0.0
 */
export * as THub from "./THub"

/**
 * @since 1.0.0
 */
export * as TMap from "./TMap"

/**
 * @since 1.0.0
 */
export * as TPriorityQueue from "./TPriorityQueue"

/**
 * @since 1.0.0
 */
export * as TQueue from "./TQueue"

/**
 * @since 1.0.0
 */
export * as TRandom from "./TRandom"

/**
 * @since 1.0.0
 */
export * as TReentrantLock from "./TReentrantLock"

/**
 * @since 1.0.0
 */
export * as TRef from "./TRef"

/**
 * @since 1.0.0
 */
export * as TSemaphore from "./TSemaphore"

/**
 * @since 1.0.0
 */
export * as TSet from "./TSet"

/**
 * @since 1.0.0
 */
export * as Take from "./Take"

/**
 * @since 1.0.0
 */
export * as TestAnnotation from "./TestAnnotation"

/**
 * @since 1.0.0
 */
export * as TestAnnotationMap from "./TestAnnotationMap"

/**
 * @since 1.0.0
 */
export * as TestAnnotations from "./TestAnnotations"

/**
 * @since 1.0.0
 */
export * as TestClock from "./TestClock"

/**
 * @since 1.0.0
 */
export * as TestConfig from "./TestConfig"

/**
 * @since 1.0.0
 */
export * as TestContext from "./TestContext"

/**
 * @since 1.0.0
 */
export * as TestLive from "./TestLive"

/**
 * @since 1.0.0
 */
export * as TestServices from "./TestServices"

/**
 * @since 1.0.0
 */
export * as TestSized from "./TestSized"

/**
 * @since 1.0.0
 */
export * as Tracer from "./Tracer"

/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 1.0.0
 */
export * as Tuple from "./Tuple"

/**
 * A collection of types that are commonly used types.
 *
 * @since 1.0.0
 */
export * as Types from "./Types"

/**
 * @since 1.0.0
 */
export * as Unify from "./Unify"

/**
 * @since 1.0.0
 */
export * as Utils from "./Utils"
