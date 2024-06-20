/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Channel from "./Channel.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Deferred from "./Deferred.js"
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as Exit from "./Exit.js"
import type { LazyArg } from "./Function.js"
import type * as GroupBy from "./GroupBy.js"
import type { TypeLambda } from "./HKT.js"
import * as _groupBy from "./internal/groupBy.js"
import * as internal from "./internal/stream.js"
import type * as Layer from "./Layer.js"
import type * as Option from "./Option.js"
import type * as Order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type * as PubSub from "./PubSub.js"
import type * as Queue from "./Queue.js"
import type { Runtime } from "./Runtime.js"
import type * as Schedule from "./Schedule.js"
import type * as Scope from "./Scope.js"
import type * as Sink from "./Sink.js"
import type * as Emit from "./StreamEmit.js"
import type * as HaltStrategy from "./StreamHaltStrategy.js"
import type * as Take from "./Take.js"
import type * as Tracer from "./Tracer.js"
import type { Covariant, NoInfer } from "./Types.js"
import type * as Unify from "./Unify.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const StreamTypeId: unique symbol = internal.StreamTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type StreamTypeId = typeof StreamTypeId

/**
 * A `Stream<A, E, R>` is a description of a program that, when evaluated, may
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
export interface Stream<out A, out E = never, out R = never> extends Stream.Variance<A, E, R>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: StreamUnify<this>
  [Unify.ignoreSymbol]?: StreamUnifyIgnore
}

/**
 * @since 2.0.0
 * @category models
 */
export interface StreamUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Stream?: () => A[Unify.typeSymbol] extends Stream<infer A0, infer E0, infer R0> | infer _ ? Stream<A0, E0, R0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface StreamUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Effect.js" {
  interface Effect<A, E, R> extends Stream<A, E, R> {}
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface StreamTypeLambda extends TypeLambda {
  readonly type: Stream<this["Target"], this["Out1"], this["Out2"]>
}

/**
 * @since 2.0.0
 */
export declare namespace Stream {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out A, out E, out R> {
    readonly [StreamTypeId]: VarianceStruct<A, E, R>
  }

  /**
   * @since 3.4.0
   * @category models
   */
  export interface VarianceStruct<out A, out E, out R> {
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
    readonly _R: Covariant<R>
  }

  /**
   * @since 3.4.0
   * @category type-level
   */
  export type Success<T extends Stream<any, any, any>> = [T] extends [Stream<infer _A, infer _E, infer _R>] ? _A : never

  /**
   * @since 3.4.0
   * @category type-level
   */
  export type Error<T extends Stream<any, any, any>> = [T] extends [Stream<infer _A, infer _E, infer _R>] ? _E : never

  /**
   * @since 3.4.0
   * @category type-level
   */
  export type Context<T extends Stream<any, any, any>> = [T] extends [Stream<infer _A, infer _E, infer _R>] ? _R : never

  /**
   * @since 2.0.0
   * @category models
   */
  export type DynamicTuple<T, N extends number> = N extends N ? number extends N ? Array<T> : DynamicTupleOf<T, N, []>
    : never

  /**
   * @since 2.0.0
   * @category models
   */
  export type DynamicTupleOf<T, N extends number, R extends Array<unknown>> = R["length"] extends N ? R
    : DynamicTupleOf<T, N, [T, ...R]>
}

/**
 * The default chunk size used by the various combinators and constructors of
 * `Stream`.
 *
 * @since 2.0.0
 * @category constants
 */
export const DefaultChunkSize: number = internal.DefaultChunkSize

/**
 * Collects each underlying Chunk of the stream into a new chunk, and emits it
 * on each pull.
 *
 * @since 2.0.0
 * @category utils
 */
export const accumulate: <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R> = internal.accumulate

/**
 * Re-chunks the elements of the stream by accumulating each underlying chunk.
 *
 * @since 2.0.0
 * @category utils
 */
export const accumulateChunks: <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R> = internal.accumulateChunks

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const acquireRelease: <A, E, R, R2, X>(
  acquire: Effect.Effect<A, E, R>,
  release: (resource: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<X, never, R2>
) => Stream<A, E, R | R2> = internal.acquireRelease

/**
 * Aggregates elements of this stream using the provided sink for as long as
 * the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators
 * upstream of this operator run on one fiber, while downstream operators run
 * on another. Whenever the downstream fiber is busy processing elements, the
 * upstream fiber will feed elements into the sink until it signals
 * completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedEffect` and
 * `Sink.foldUntilEffect` for sinks that cover the common usecases.
 *
 * @since 2.0.0
 * @category utils
 */
export const aggregate: {
  <B, A, A2, E2, R2>(sink: Sink.Sink<B, A | A2, A2, E2, R2>): <E, R>(self: Stream<A, E, R>) => Stream<B, E2 | E, R2 | R>
  <A, E, R, B, A2, E2, R2>(self: Stream<A, E, R>, sink: Sink.Sink<B, A | A2, A2, E2, R2>): Stream<B, E | E2, R | R2>
} = internal.aggregate

/**
 * Like `aggregateWithinEither`, but only returns the `Right` results.
 *
 * @param sink A `Sink` used to perform the aggregation.
 * @param schedule A `Schedule` used to signal when to stop the aggregation.
 * @since 2.0.0
 * @category utils
 */
export const aggregateWithin: {
  <B, A, A2, E2, R2, C, R3>(
    sink: Sink.Sink<B, A | A2, A2, E2, R2>,
    schedule: Schedule.Schedule<C, Option.Option<B>, R3>
  ): <E, R>(self: Stream<A, E, R>) => Stream<B, E2 | E, R2 | R3 | R>
  <A, E, R, B, A2, E2, R2, C, R3>(
    self: Stream<A, E, R>,
    sink: Sink.Sink<B, A | A2, A2, E2, R2>,
    schedule: Schedule.Schedule<C, Option.Option<B>, R3>
  ): Stream<B, E | E2, R | R2 | R3>
} = internal.aggregateWithin

/**
 * Aggregates elements using the provided sink until it completes, or until
 * the delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators
 * upstream of this operator run on one fiber, while downstream operators run
 * on another. Elements will be aggregated by the sink until the downstream
 * fiber pulls the aggregated value, or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays
 * between pulls.
 *
 * @param sink A `Sink` used to perform the aggregation.
 * @param schedule A `Schedule` used to signal when to stop the aggregation.
 * @since 2.0.0
 * @category utils
 */
export const aggregateWithinEither: {
  <B, A, A2, E2, R2, C, R3>(
    sink: Sink.Sink<B, A | A2, A2, E2, R2>,
    schedule: Schedule.Schedule<C, Option.Option<B>, R3>
  ): <E, R>(self: Stream<A, E, R>) => Stream<Either.Either<B, C>, E2 | E, R2 | R3 | R>
  <A, E, R, B, A2, E2, R2, C, R3>(
    self: Stream<A, E, R>,
    sink: Sink.Sink<B, A | A2, A2, E2, R2>,
    schedule: Schedule.Schedule<C, Option.Option<B>, R3>
  ): Stream<Either.Either<B, C>, E | E2, R | R2 | R3>
} = internal.aggregateWithinEither

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <B>(value: B): <A, E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A, E, R, B>(self: Stream<A, E, R>, value: B): Stream<B, E, R>
} = internal.as

const _async: <A, E = never, R = never>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<void, never, R> | void,
  outputBuffer?: number
) => Stream<A, E, R> = internal._async

export {
  /**
   * Creates a stream from an asynchronous callback that can be called multiple
   * times. The optionality of the error type `E` in `Emit` can be used to
   * signal the end of the stream by setting it to `None`.
   *
   * The registration function can optionally return an `Effect`, which will be
   * executed if the `Fiber` executing this Effect is interrupted.
   *
   * @since 2.0.0
   * @category constructors
   */
  _async as async
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times The registration of the callback itself returns an effect. The
 * optionality of the error type `E` can be used to signal the end of the
 * stream, by setting it to `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncEffect: <A, E = never, R = never>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<unknown, E, R>,
  outputBuffer?: number
) => Stream<A, E, R> = internal.asyncEffect

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback itself returns an a scoped
 * resource. The optionality of the error type `E` can be used to signal the
 * end of the stream, by setting it to `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncScoped: <A, E = never, R = never>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<unknown, E, R | Scope.Scope>,
  outputBuffer?: number
) => Stream<A, E, Exclude<R, Scope.Scope>> = internal.asyncScoped

/**
 * Returns a `Stream` that first collects `n` elements from the input `Stream`,
 * and then creates a new `Stream` using the specified function, and sends all
 * the following elements through that.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const branchAfter: {
  <A, A2, E2, R2>(
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<A2, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<A2, E2, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.branchAfter

/**
 * Fan out the stream, producing a list of streams that have the same elements
 * as this stream. The driver stream will only ever advance the `maximumLag`
 * chunks before the slowest downstream stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const broadcast: {
  <N extends number>(
    n: N,
    maximumLag: number
  ): <A, E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<Stream.DynamicTuple<Stream<A, E>, N>, never, Scope.Scope | R>
  <A, E, R, N extends number>(
    self: Stream<A, E, R>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Stream.DynamicTuple<Stream<A, E>, N>, never, Scope.Scope | R>
} = internal.broadcast

/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const broadcastDynamic: {
  (maximumLag: number): <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Stream<A, E>, never, Scope.Scope | R>
  <A, E, R>(self: Stream<A, E, R>, maximumLag: number): Effect.Effect<Stream<A, E>, never, Scope.Scope | R>
} = internal.broadcastDynamic

/**
 * Converts the stream to a scoped list of queues. Every value will be
 * replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @since 2.0.0
 * @category utils
 */
export const broadcastedQueues: {
  <N extends number>(
    n: N,
    maximumLag: number
  ): <A, E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<Stream.DynamicTuple<Queue.Dequeue<Take.Take<A, E>>, N>, never, R | Scope.Scope>
  <A, E, R, N extends number>(
    self: Stream<A, E, R>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Stream.DynamicTuple<Queue.Dequeue<Take.Take<A, E>>, N>, never, Scope.Scope | R>
} = internal.broadcastedQueues

/**
 * Converts the stream to a scoped dynamic amount of queues. Every chunk will
 * be replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @since 2.0.0
 * @category utils
 */
export const broadcastedQueuesDynamic: {
  (
    maximumLag: number
  ): <A, E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<Effect.Effect<Queue.Dequeue<Take.Take<A, E>>, never, Scope.Scope>, never, R | Scope.Scope>
  <A, E, R>(
    self: Stream<A, E, R>,
    maximumLag: number
  ): Effect.Effect<Effect.Effect<Queue.Dequeue<Take.Take<A, E>>, never, Scope.Scope>, never, Scope.Scope | R>
} = internal.broadcastedQueuesDynamic

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a queue.
 *
 * @note This combinator destroys the chunking structure. It's recommended to
 *       use rechunk afterwards. Additionally, prefer capacities that are powers
 *       of 2 for better performance.
 * @since 2.0.0
 * @category utils
 */
export const buffer: {
  (
    options: { readonly capacity: "unbounded" } | {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options: { readonly capacity: "unbounded" } | {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ): Stream<A, E, R>
} = internal.buffer

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 * @since 2.0.0
 * @category utils
 */
export const bufferChunks: {
  (
    options: { readonly capacity: number; readonly strategy?: "dropping" | "sliding" | "suspend" | undefined }
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options: { readonly capacity: number; readonly strategy?: "dropping" | "sliding" | "suspend" | undefined }
  ): Stream<A, E, R>
} = internal.bufferChunks

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAll: {
  <E, A2, E2, R2>(f: (error: E) => Stream<A2, E2, R2>): <A, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, f: (error: E) => Stream<A2, E2, R2>): Stream<A | A2, E2, R | R2>
} = internal.catchAll

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails. Allows recovery from all causes of failure, including
 * interruption if the stream is uninterruptible.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAllCause: {
  <E, A2, E2, R2>(
    f: (cause: Cause.Cause<E>) => Stream<A2, E2, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (cause: Cause.Cause<E>) => Stream<A2, E2, R2>
  ): Stream<A | A2, E2, R | R2>
} = internal.catchAllCause

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, A2, E2, R2>(
    pf: (error: E) => Option.Option<Stream<A2, E2, R2>>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A2 | A, E | E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    pf: (error: E) => Option.Option<Stream<A2, E2, R2>>
  ): Stream<A | A2, E | E2, R | R2>
} = internal.catchSome

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with an error matching the given `_tag`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E["_tag"] & string, E extends { _tag: string }, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<A1, E1, R1>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E extends { _tag: string }, R, K extends E["_tag"] & string, A1, E1, R1>(
    self: Stream<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<A1, E1, R1>
  ): Stream<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = internal.catchTag

/**
 * Switches over to the stream produced by one of the provided functions, in
 * case this one fails with an error matching one of the given `_tag`'s.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends { [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Stream<any, any, any> }
  >(
    cases: Cases
  ): <A, R>(
    self: Stream<A, E, R>
  ) => Stream<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer A, infer _E, infer _R> ? A
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _A, infer E, infer _R> ? E
        : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _A, infer _E, infer R> ? R
        : never
    }[keyof Cases]
  >
  <
    A,
    E extends { _tag: string },
    R,
    Cases extends { [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Stream<any, any, any> }
  >(
    self: Stream<A, E, R>,
    cases: Cases
  ): Stream<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer _E, infer A> ? A
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer E, infer _A> ? E
        : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer R, infer _E, infer _A> ? R
        : never
    }[keyof Cases]
  >
} = internal.catchTags

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some errors. Allows recovery from all causes of failure,
 * including interruption if the stream is uninterruptible.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSomeCause: {
  <E, A2, E2, R2>(
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<A2, E2, R2>>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A2 | A, E | E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<A2, E2, R2>>
  ): Stream<A | A2, E | E2, R | R2>
} = internal.catchSomeCause

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using natural equality to determine whether two
 * elements are equal.
 *
 * @since 2.0.0
 * @category utils
 */
export const changes: <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R> = internal.changes

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @since 2.0.0
 * @category utils
 */
export const changesWith: {
  <A>(f: (x: A, y: A) => boolean): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, f: (x: A, y: A) => boolean): Stream<A, E, R>
} = internal.changesWith

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified effectual function to
 * determine whether two elements are equal.
 *
 * @since 2.0.0
 * @category utils
 */
export const changesWithEffect: {
  <A, E2, R2>(
    f: (x: A, y: A) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Stream<A, E, R>, f: (x: A, y: A) => Effect.Effect<boolean, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.changesWithEffect

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of
 * elements.
 *
 * @since 2.0.0
 * @category utils
 */
export const chunks: <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R> = internal.chunks

/**
 * Performs the specified stream transformation with the chunk structure of
 * the stream exposed.
 *
 * @since 2.0.0
 * @category utils
 */
export const chunksWith: {
  <A, E, R, A2, E2, R2>(
    f: (stream: Stream<Chunk.Chunk<A>, E, R>) => Stream<Chunk.Chunk<A2>, E2, R2>
  ): (self: Stream<A, E, R>) => Stream<A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (stream: Stream<Chunk.Chunk<A>, E, R>) => Stream<Chunk.Chunk<A2>, E2, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.chunksWith

/**
 * Combines the elements from this stream and the specified stream by
 * repeatedly applying the function `f` to extract an element using both sides
 * and conceptually "offer" it to the destination stream. `f` can maintain
 * some internal state to control the combining process, with the initial
 * state being specified by `s`.
 *
 * Where possible, prefer `Stream.combineChunks` for a more efficient
 * implementation.
 *
 * @since 2.0.0
 * @category utils
 */
export const combine: {
  <A2, E2, R2, S, R3, E, A, R4, R5, A3>(
    that: Stream<A2, E2, R2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<A, Option.Option<E>, R3>,
      pullRight: Effect.Effect<A2, Option.Option<E2>, R4>
    ) => Effect.Effect<Exit.Exit<readonly [A3, S], Option.Option<E2 | E>>, never, R5>
  ): <R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R3 | R4 | R5 | R>
  <R, A2, E2, R2, S, R3, E, A, R4, R5, A3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<A, Option.Option<E>, R3>,
      pullRight: Effect.Effect<A2, Option.Option<E2>, R4>
    ) => Effect.Effect<Exit.Exit<readonly [A3, S], Option.Option<E2 | E>>, never, R5>
  ): Stream<A3, E2 | E, R | R2 | R3 | R4 | R5>
} = internal.combine

/**
 * Combines the chunks from this stream and the specified stream by repeatedly
 * applying the function `f` to extract a chunk using both sides and
 * conceptually "offer" it to the destination stream. `f` can maintain some
 * internal state to control the combining process, with the initial state
 * being specified by `s`.
 *
 * @since 2.0.0
 * @category utils
 */
export const combineChunks: {
  <A2, E2, R2, S, R3, E, A, R4, R5, A3>(
    that: Stream<A2, E2, R2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R3>,
      pullRight: Effect.Effect<Chunk.Chunk<A2>, Option.Option<E2>, R4>
    ) => Effect.Effect<Exit.Exit<readonly [Chunk.Chunk<A3>, S], Option.Option<E2 | E>>, never, R5>
  ): <R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R3 | R4 | R5 | R>
  <R, A2, E2, R2, S, R3, E, A, R4, R5, A3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R3>,
      pullRight: Effect.Effect<Chunk.Chunk<A2>, Option.Option<E2>, R4>
    ) => Effect.Effect<Exit.Exit<readonly [Chunk.Chunk<A3>, S], Option.Option<E2 | E>>, never, R5>
  ): Stream<A3, E2 | E, R | R2 | R3 | R4 | R5>
} = internal.combineChunks

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the
 * specified stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const concat: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A | A2, E | E2, R | R2>
} = internal.concat

/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const concatAll: <A, E, R>(streams: Chunk.Chunk<Stream<A, E, R>>) => Stream<A, E, R> = internal.concatAll

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @since 2.0.0
 * @category utils
 */
export const cross: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<[A, A2], E | E2, R | R2>
} = internal.cross

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from this stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipLeft` for the more common point-wise variant.
 *
 * @since 2.0.0
 * @category utils
 */
export const crossLeft: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.crossLeft

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from the other stream. The
 * `that` stream would be run multiple times, for every element in the `this`
 * stream.
 *
 * See also `Stream.zipRight` for the more common point-wise variant.
 *
 * @since 2.0.0
 * @category utils
 */
export const crossRight: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A2, E | E2, R | R2>
} = internal.crossRight

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements with a specified function. The `that` stream would be
 * run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipWith` for the more common point-wise variant.
 *
 * @since 2.0.0
 * @category utils
 */
export const crossWith: {
  <B, E2, R2, A, C>(
    that: Stream<B, E2, R2>,
    f: (a: A, b: B) => C
  ): <E, R>(self: Stream<A, E, R>) => Stream<C, E2 | E, R2 | R>
  <A, E, R, B, E2, R2, C>(
    self: Stream<A, E, R>,
    that: Stream<B, E2, R2>,
    f: (a: A, b: B) => C
  ): Stream<C, E | E2, R | R2>
} = internal.crossWith

/**
 * Delays the emission of values by holding new values for a set duration. If
 * no new values arrive during that time the value is emitted, however if a
 * new value is received during the holding period the previous value is
 * discarded and the process is repeated with the new value.
 *
 * This operator is useful if you have a stream of "bursty" events which
 * eventually settle down and you only need the final event of the burst. For
 * example, a search engine may only want to initiate a search after a user
 * has paused typing so as to not prematurely recommend results.
 *
 * @since 2.0.0
 * @category utils
 */
export const debounce: {
  (duration: Duration.DurationInput): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, duration: Duration.DurationInput): Stream<A, E, R>
} = internal.debounce

/**
 * The stream that dies with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Stream<never> = internal.die

/**
 * The stream that dies with the specified lazily evaluated defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Stream<never> = internal.dieSync

/**
 * The stream that dies with an exception described by `message`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Stream<never> = internal.dieMessage

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 *
 * @since 2.0.0
 * @category utils
 */
export const distributedWith: {
  <N extends number, A>(
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<Predicate<number>>
    }
  ): <E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>, N>, never, Scope.Scope | R>
  <A, E, R, N extends number>(
    self: Stream<A, E, R>,
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<Predicate<number>>
    }
  ): Effect.Effect<Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>, N>, never, Scope.Scope | R>
} = internal.distributedWith

/**
 * More powerful version of `Stream.distributedWith`. This returns a function
 * that will produce new queues and corresponding indices. You can also
 * provide a function that will be executed after the final events are
 * enqueued in all queues. Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver
 * will continue but no longer backpressure on them.
 *
 * @since 2.0.0
 * @category utils
 */
export const distributedWithDynamic: {
  <A>(
    options: { readonly maximumLag: number; readonly decide: (a: A) => Effect.Effect<Predicate<number>, never, never> }
  ): <E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<
    Effect.Effect<[number, Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>], never, never>,
    never,
    Scope.Scope | R
  >
  <A, E, R>(
    self: Stream<A, E, R>,
    options: { readonly maximumLag: number; readonly decide: (a: A) => Effect.Effect<Predicate<number>, never, never> }
  ): Effect.Effect<
    Effect.Effect<[number, Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>], never, never>,
    never,
    Scope.Scope | R
  >
} = internal.distributedWithDynamic

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 *
 * @since 2.0.0
 * @category utils
 */
export const drain: <A, E, R>(self: Stream<A, E, R>) => Stream<never, E, R> = internal.drain

/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @since 2.0.0
 * @category utils
 */
export const drainFork: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.drainFork

/**
 * Drops the specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const drop: {
  (n: number): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, n: number): Stream<A, E, R>
} = internal.drop

/**
 * Drops the last specified number of elements from this stream.
 *
 * @note This combinator keeps `n` elements in memory. Be careful with big
 *       numbers.
 * @since 2.0.0
 * @category utils
 */
export const dropRight: {
  (n: number): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, n: number): Stream<A, E, R>
} = internal.dropRight

/**
 * Drops all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropUntil: {
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.dropUntil

/**
 * Drops all elements of the stream until the specified effectful predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropUntilEffect: {
  <A, E2, R2>(
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): Stream<A, E | E2, R | R2>
} = internal.dropUntilEffect

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropWhile: {
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.dropWhile

/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`
 *
 * @since 2.0.0
 * @category utils
 */
export const dropWhileEffect: {
  <A, E2, R2>(
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    predicate: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Stream<A, E | E2, R | R2>
} = internal.dropWhileEffect

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have been
 * exposed as part of the `Either` success case.
 *
 * @note The stream will end as soon as the first error occurs.
 *
 * @since 2.0.0
 * @category utils
 */
export const either: <A, E, R>(self: Stream<A, E, R>) => Stream<Either.Either<A, E>, never, R> = internal.either

/**
 * The empty stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: Stream<never> = internal.empty

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @since 2.0.0
 * @category utils
 */
export const ensuring: {
  <X, R2>(finalizer: Effect.Effect<X, never, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, X, R2>(self: Stream<A, E, R>, finalizer: Effect.Effect<X, never, R2>): Stream<A, E, R | R2>
} = internal.ensuring

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @since 2.0.0
 * @category utils
 */
export const ensuringWith: {
  <E, R2>(
    finalizer: (exit: Exit.Exit<unknown, E>) => Effect.Effect<unknown, never, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, R2>(
    self: Stream<A, E, R>,
    finalizer: (exit: Exit.Exit<unknown, E>) => Effect.Effect<unknown, never, R2>
  ): Stream<A, E, R | R2>
} = internal.ensuringWith

/**
 * Accesses the whole context of the stream.
 *
 * @since 2.0.0
 * @category context
 */
export const context: <R>() => Stream<Context.Context<R>, never, R> = internal.context

/**
 * Accesses the context of the stream.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWith: <R, A>(f: (env: Context.Context<R>) => A) => Stream<A, never, R> = internal.contextWith

/**
 * Accesses the context of the stream in the context of an effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithEffect: <R0, A, E, R>(
  f: (env: Context.Context<R0>) => Effect.Effect<A, E, R>
) => Stream<A, E, R0 | R> = internal.contextWithEffect

/**
 * Accesses the context of the stream in the context of a stream.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithStream: <R0, A, E, R>(
  f: (env: Context.Context<R0>) => Stream<A, E, R>
) => Stream<A, E, R0 | R> = internal.contextWithStream

/**
 * Creates a stream that executes the specified effect but emits no elements.
 *
 * @since 2.0.0
 * @category constructors
 */
export const execute: <X, E, R>(effect: Effect.Effect<X, E, R>) => Stream<never, E, R> = internal.execute

/**
 * Terminates with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Stream<never, E> = internal.fail

/**
 * Terminates with the specified lazily evaluated error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Stream<never, E> = internal.failSync

/**
 * The stream that always fails with the specified `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Stream<never, E> = internal.failCause

/**
 * The stream that always fails with the specified lazily evaluated `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Stream<never, E> = internal.failCauseSync

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A, B extends A>(predicate: Predicate<B>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R, B extends A>(self: Stream<A, E, R>, refinement: Refinement<A, B>): Stream<B, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.filter

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterEffect: {
  <A, E2, R2>(
    f: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Stream<A, E, R>, f: (a: A) => Effect.Effect<boolean, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.filterEffect

/**
 * Performs a filter and map in a single step.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMap: {
  <A, B>(pf: (a: A) => Option.Option<B>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A, E, R, B>(self: Stream<A, E, R>, pf: (a: A) => Option.Option<B>): Stream<B, E, R>
} = internal.filterMap

/**
 * Performs an effectful filter and map in a single step.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapEffect: {
  <A, A2, E2, R2>(
    pf: (a: A) => Option.Option<Effect.Effect<A2, E2, R2>>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    pf: (a: A) => Option.Option<Effect.Effect<A2, E2, R2>>
  ): Stream<A2, E | E2, R | R2>
} = internal.filterMapEffect

/**
 * Transforms all elements of the stream for as long as the specified partial
 * function is defined.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapWhile: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <E, R>(self: Stream<A, E, R>) => Stream<A2, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, pf: (a: A) => Option.Option<A2>): Stream<A2, E, R>
} = internal.filterMapWhile

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapWhileEffect: {
  <A, A2, E2, R2>(
    pf: (a: A) => Option.Option<Effect.Effect<A2, E2, R2>>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    pf: (a: A) => Option.Option<Effect.Effect<A2, E2, R2>>
  ): Stream<A2, E | E2, R | R2>
} = internal.filterMapWhileEffect

/**
 * Creates a one-element stream that never fails and executes the finalizer
 * when it ends.
 *
 * @since 2.0.0
 * @category constructors
 */
export const finalizer: <R, X>(finalizer: Effect.Effect<X, never, R>) => Stream<void, never, R> = internal.finalizer

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 *
 * @since 2.0.0
 * @category elements
 */
export const find: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R, B extends A>(self: Stream<A, E, R>, refinement: Refinement<A, B>): Stream<B, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.find

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 *
 * @since 2.0.0
 * @category elements
 */
export const findEffect: {
  <A, E2, R2>(
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): Stream<A, E | E2, R | R2>
} = internal.findEffect

/**
 * Returns a stream made of the concatenation in strict order of all the
 * streams produced by passing each element of this stream to `f0`
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, A2, E2, R2>(
    f: (a: A) => Stream<A2, E2, R2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    } | undefined
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Stream<A2, E2, R2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    } | undefined
  ): Stream<A2, E | E2, R | R2>
} = internal.flatMap

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: {
  (
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
      | undefined
  ): <A, E2, R2, E, R>(self: Stream<Stream<A, E2, R2>, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E2, R2, E, R>(
    self: Stream<Stream<A, E2, R2>, E, R>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
      | undefined
  ): Stream<A, E2 | E, R2 | R>
} = internal.flatten

/**
 * Submerges the chunks carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenChunks: <A, E, R>(self: Stream<Chunk.Chunk<A>, E, R>) => Stream<A, E, R> = internal.flattenChunks

/**
 * Flattens `Effect` values into the stream's structure, preserving all
 * information about the effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenEffect: {
  (
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
      | undefined
  ): <A, E2, R2, E, R>(self: Stream<Effect.Effect<A, E2, R2>, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E2, R2, E, R>(
    self: Stream<Effect.Effect<A, E2, R2>, E, R>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
      | undefined
  ): Stream<A, E2 | E, R2 | R>
} = internal.flattenEffect

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit` values that do not signal end-of-stream, prefer:
 *
 * ```ts
 * stream.mapZIO(ZIO.done(_))
 * ```
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenExitOption: <A, E2, E, R>(
  self: Stream<Exit.Exit<A, Option.Option<E2>>, E, R>
) => Stream<A, E | E2, R> = internal.flattenExitOption

/**
 * Submerges the iterables carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenIterables: <A, E, R>(self: Stream<Iterable<A>, E, R>) => Stream<A, E, R> = internal.flattenIterables

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream
 * by failing with `None`.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenTake: <A, E2, E, R>(self: Stream<Take.Take<A, E2>, E, R>) => Stream<A, E | E2, R> =
  internal.flattenTake

/**
 * Repeats this stream forever.
 *
 * @since 2.0.0
 * @category utils
 */
export const forever: <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R> = internal.forever

/**
 * Creates a stream from an `AsyncIterable`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromAsyncIterable: <A, E>(iterable: AsyncIterable<A>, onError: (e: unknown) => E) => Stream<A, E> =
  internal.fromAsyncIterable

/**
 * Creates a stream from a `Channel`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChannel: <A, E, R>(
  channel: Channel.Channel<Chunk.Chunk<A>, unknown, E, unknown, unknown, unknown, R>
) => Stream<A, E, R> = internal.fromChannel

/**
 * Creates a channel from a `Stream`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const toChannel: <A, E, R>(
  stream: Stream<A, E, R>
) => Channel.Channel<Chunk.Chunk<A>, unknown, E, unknown, unknown, unknown, R> = internal.toChannel

/**
 * Creates a stream from a `Chunk` of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChunk: <A>(chunk: Chunk.Chunk<A>) => Stream<A> = internal.fromChunk

/**
 * Creates a stream from a subscription to a `PubSub`.
 *
 * @param shutdown If `true`, the `PubSub` will be shutdown after the stream is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromChunkPubSub: {
  <A>(
    pubsub: PubSub.PubSub<Chunk.Chunk<A>>,
    options: { readonly scoped: true; readonly shutdown?: boolean | undefined }
  ): Effect.Effect<Stream<A>, never, Scope.Scope>
  <A>(
    pubsub: PubSub.PubSub<Chunk.Chunk<A>>,
    options?: { readonly scoped?: false | undefined; readonly shutdown?: boolean | undefined } | undefined
  ): Stream<A>
} = internal.fromChunkPubSub

/**
 * Creates a stream from a `Queue` of values.
 *
 * @param shutdown If `true`, the queue will be shutdown after the stream is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromChunkQueue: <A>(
  queue: Queue.Dequeue<Chunk.Chunk<A>>,
  options?: {
    readonly shutdown?: boolean | undefined
  }
) => Stream<A> = internal.fromChunkQueue

/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChunks: <A>(...chunks: Array<Chunk.Chunk<A>>) => Stream<A> = internal.fromChunks

/**
 * Either emits the success value of this effect or terminates the stream
 * with the failure value of this effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream<A, E, R> = internal.fromEffect

/**
 * Creates a stream from an effect producing a value of type `A` or an empty
 * `Stream`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffectOption: <A, E, R>(effect: Effect.Effect<A, Option.Option<E>, R>) => Stream<A, E, R> =
  internal.fromEffectOption

/**
 * Creates a stream from a subscription to a `PubSub`.
 *
 * @param shutdown If `true`, the `PubSub` will be shutdown after the stream is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromPubSub: {
  <A>(
    pubsub: PubSub.PubSub<A>,
    options: {
      readonly scoped: true
      readonly maxChunkSize?: number | undefined
      readonly shutdown?: boolean | undefined
    }
  ): Effect.Effect<Stream<A>, never, Scope.Scope>
  <A>(
    pubsub: PubSub.PubSub<A>,
    options?: {
      readonly scoped?: false | undefined
      readonly maxChunkSize?: number | undefined
      readonly shutdown?: boolean | undefined
    } | undefined
  ): Stream<A>
} = internal.fromPubSub

/**
 * Creates a new `Stream` from an iterable collection of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <A>(iterable: Iterable<A>) => Stream<A> = internal.fromIterable

/**
 * Creates a stream from an effect producing a value of type `Iterable<A>`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterableEffect: <A, E, R>(effect: Effect.Effect<Iterable<A>, E, R>) => Stream<A, E, R> =
  internal.fromIterableEffect

/**
 * Creates a stream from an iterator
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIteratorSucceed: <A>(iterator: IterableIterator<A>, maxChunkSize?: number) => Stream<A> =
  internal.fromIteratorSucceed

/**
 * Creates a stream from an effect that pulls elements from another stream.
 *
 * See `Stream.toPull` for reference.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromPull: <R, R2, E, A>(
  effect: Effect.Effect<Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R2>, never, Scope.Scope | R>
) => Stream<A, E, R2 | Exclude<R, Scope.Scope>> = internal.fromPull

/**
 * Creates a stream from a queue of values
 *
 * @param maxChunkSize The maximum number of queued elements to put in one chunk in the stream
 * @param shutdown If `true`, the queue will be shutdown after the stream is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromQueue: <A>(
  queue: Queue.Dequeue<A>,
  options?: {
    readonly maxChunkSize?: number | undefined
    readonly shutdown?: boolean | undefined
  }
) => Stream<A> = internal.fromQueue

/**
 * Creates a stream from a `ReadableStream`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromReadableStream: <A, E>(
  evaluate: LazyArg<ReadableStream<A>>,
  onError: (error: unknown) => E
) => Stream<A, E> = internal.fromReadableStream

/**
 * Creates a stream from a `ReadableStreamBYOBReader`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamBYOBReader.
 *
 * @param allocSize Controls the size of the underlying `ArrayBuffer` (defaults to `4096`).
 * @since 2.0.0
 * @category constructors
 */
export const fromReadableStreamByob: <E>(
  evaluate: LazyArg<ReadableStream<Uint8Array>>,
  onError: (error: unknown) => E,
  allocSize?: number
) => Stream<Uint8Array, E> = internal.fromReadableStreamByob

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromSchedule: <A, R>(schedule: Schedule.Schedule<A, unknown, R>) => Stream<A, never, R> =
  internal.fromSchedule

/**
 * Creates a pipeline that groups on adjacent keys, calculated by the
 * specified function.
 *
 * @since 2.0.0
 * @category grouping
 */
export const groupAdjacentBy: {
  <A, K>(f: (a: A) => K): <E, R>(self: Stream<A, E, R>) => Stream<[K, Chunk.NonEmptyChunk<A>], E, R>
  <A, E, R, K>(self: Stream<A, E, R>, f: (a: A) => K): Stream<[K, Chunk.NonEmptyChunk<A>], E, R>
} = internal.groupAdjacentBy

/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @since 2.0.0
 * @category grouping
 */
export const groupBy: {
  <A, K, V, E2, R2>(
    f: (a: A) => Effect.Effect<readonly [K, V], E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): <E, R>(self: Stream<A, E, R>) => GroupBy.GroupBy<K, V, E2 | E, R2 | R>
  <A, E, R, K, V, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<readonly [K, V], E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): GroupBy.GroupBy<K, V, E | E2, R | R2>
} = _groupBy.groupBy

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used to further filter down which
 * groups shall be processed.
 *
 * After calling apply on the GroupBy object, the remaining groups will be
 * processed in parallel and the resulting streams merged in a
 * nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the
 * producer is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 *
 * For example, to collect the first 2 words for every starting letter from a
 * stream of words:
 *
 * ```ts
 * import * as GroupBy from "./GroupBy"
 * import * as Stream from "./Stream"
 * import { pipe } from "./Function"
 *
 * pipe(
 *   Stream.fromIterable(["hello", "world", "hi", "holla"]),
 *   Stream.groupByKey((word) => word[0]),
 *   GroupBy.evaluate((key, stream) =>
 *     pipe(
 *       stream,
 *       Stream.take(2),
 *       Stream.map((words) => [key, words] as const)
 *     )
 *   )
 * )
 * ```
 *
 * @since 2.0.0
 * @category utils
 */
export const groupByKey: {
  <A, K>(
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): <E, R>(self: Stream<A, E, R>) => GroupBy.GroupBy<K, A, E, R>
  <A, E, R, K>(
    self: Stream<A, E, R>,
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): GroupBy.GroupBy<K, A, E, R>
} = _groupBy.groupByKey

/**
 * Partitions the stream with specified `chunkSize`.
 *
 * @since 2.0.0
 * @category utils
 */
export const grouped: {
  (chunkSize: number): <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, chunkSize: number): Stream<Chunk.Chunk<A>, E, R>
} = internal.grouped

/**
 * Partitions the stream with the specified `chunkSize` or until the specified
 * `duration` has passed, whichever is satisfied first.
 *
 * @since 2.0.0
 * @category utils
 */
export const groupedWithin: {
  (
    chunkSize: number,
    duration: Duration.DurationInput
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, chunkSize: number, duration: Duration.DurationInput): Stream<Chunk.Chunk<A>, E, R>
} = internal.groupedWithin

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @since 2.0.0
 * @category utils
 */
export const haltAfter: {
  (duration: Duration.DurationInput): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, duration: Duration.DurationInput): Stream<A, E, R>
} = internal.haltAfter

/**
 * Halts the evaluation of this stream when the provided effect completes. The
 * given effect will be forked as part of the returned stream, and its success
 * will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the
 * effect completes. See `interruptWhen` for this behavior.
 *
 * If the effect completes with a failure, the stream will emit that failure.
 *
 * @since 2.0.0
 * @category utils
 */
export const haltWhen: {
  <X, E2, R2>(effect: Effect.Effect<X, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(self: Stream<A, E, R>, effect: Effect.Effect<X, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.haltWhen

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @since 2.0.0
 * @category utils
 */
export const haltWhenDeferred: {
  <X, E2>(deferred: Deferred.Deferred<X, E2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R>
  <A, E, R, X, E2>(self: Stream<A, E, R>, deferred: Deferred.Deferred<X, E2>): Stream<A, E | E2, R>
} = internal.haltWhenDeferred

/**
 * The identity pipeline, which does not modify streams in any way.
 *
 * @since 2.0.0
 * @category utils
 */
export const identity: <A, E = never, R = never>() => Stream<A, E, R> = internal.identityStream

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream. When
 * one stream is exhausted all remaining values in the other stream will be
 * pulled.
 *
 * @since 2.0.0
 * @category utils
 */
export const interleave: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A | A2, E | E2, R | R2>
} = internal.interleave

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `pull` to control which stream to pull from next.
 * A value of `true` indicates to pull from this stream and a value of `false`
 * indicates to pull from the specified stream. Only consumes as many elements
 * as requested by the `pull` stream. If either this stream or the specified
 * stream are exhausted further requests for values from that stream will be
 * ignored.
 *
 * @since 2.0.0
 * @category utils
 */
export const interleaveWith: {
  <A2, E2, R2, E3, R3>(
    that: Stream<A2, E2, R2>,
    decider: Stream<boolean, E3, R3>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E3 | E, R2 | R3 | R>
  <A, E, R, A2, E2, R2, E3, R3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    decider: Stream<boolean, E3, R3>
  ): Stream<A | A2, E | E2 | E3, R | R2 | R3>
} = internal.interleaveWith

/**
 * Intersperse stream with provided `element`.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersperse: {
  <A2>(element: A2): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, element: A2): Stream<A | A2, E, R>
} = internal.intersperse

/**
 * Intersperse the specified element, also adding a prefix and a suffix.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersperseAffixes: {
  <A2, A3, A4>(
    options: { readonly start: A2; readonly middle: A3; readonly end: A4 }
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A3 | A4 | A, E, R>
  <A, E, R, A2, A3, A4>(
    self: Stream<A, E, R>,
    options: { readonly start: A2; readonly middle: A3; readonly end: A4 }
  ): Stream<A | A2 | A3 | A4, E, R>
} = internal.intersperseAffixes

/**
 * Specialized version of `Stream.interruptWhen` which interrupts the
 * evaluation of this stream after the given `Duration`.
 *
 * @since 2.0.0
 * @category utils
 */
export const interruptAfter: {
  (duration: Duration.DurationInput): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, duration: Duration.DurationInput): Stream<A, E, R>
} = internal.interruptAfter

/**
 * Interrupts the evaluation of this stream when the provided effect
 * completes. The given effect will be forked as part of this stream, and its
 * success will be discarded. This combinator will also interrupt any
 * in-progress element being pulled from upstream.
 *
 * If the effect completes with a failure before the stream completes, the
 * returned stream will emit that failure.
 *
 * @since 2.0.0
 * @category utils
 */
export const interruptWhen: {
  <X, E2, R2>(effect: Effect.Effect<X, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(self: Stream<A, E, R>, effect: Effect.Effect<X, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.interruptWhen

/**
 * Interrupts the evaluation of this stream when the provided promise
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @since 2.0.0
 * @category utils
 */
export const interruptWhenDeferred: {
  <X, E2>(deferred: Deferred.Deferred<X, E2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R>
  <A, E, R, X, E2>(self: Stream<A, E, R>, deferred: Deferred.Deferred<X, E2>): Stream<A, E | E2, R>
} = internal.interruptWhenDeferred

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)),
 * f(f(f(a))), ...
 *
 * @since 2.0.0
 * @category constructors
 */
export const iterate: <A>(value: A, next: (value: A) => A) => Stream<A> = internal.iterate

/**
 * Creates a stream from an sequence of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <As extends Array<any>>(...as: As) => Stream<As[number]> = internal.make

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A, E, R, B>(self: Stream<A, E, R>, f: (a: A) => B): Stream<B, E, R>
} = internal.map

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccum: {
  <S, A, A2>(s: S, f: (s: S, a: A) => readonly [S, A2]): <E, R>(self: Stream<A, E, R>) => Stream<A2, E, R>
  <A, E, R, S, A2>(self: Stream<A, E, R>, s: S, f: (s: S, a: A) => readonly [S, A2]): Stream<A2, E, R>
} = internal.mapAccum

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccumEffect: {
  <S, A, A2, E2, R2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<readonly [S, A2], E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, S, A2, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<readonly [S, A2], E2, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.mapAccumEffect

/**
 * Returns a stream whose failure and success channels have been mapped by the
 * specified `onFailure` and `onSuccess` functions.
 *
 * @since 2.0.0
 * @category utils
 */
export const mapBoth: {
  <E, E2, A, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): <R>(self: Stream<A, E, R>) => Stream<A2, E2, R>
  <A, E, R, E2, A2>(
    self: Stream<A, E, R>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Stream<A2, E2, R>
} = internal.mapBoth

/**
 * Transforms the chunks emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapChunks: {
  <A, B>(f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A, E, R, B>(self: Stream<A, E, R>, f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): Stream<B, E, R>
} = internal.mapChunks

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapChunksEffect: {
  <A, B, E2, R2>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<Chunk.Chunk<B>, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<B, E2 | E, R2 | R>
  <A, E, R, B, E2, R2>(
    self: Stream<A, E, R>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<Chunk.Chunk<B>, E2, R2>
  ): Stream<B, E | E2, R | R2>
} = internal.mapChunksEffect

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcat: {
  <A, A2>(f: (a: A) => Iterable<A2>): <E, R>(self: Stream<A, E, R>) => Stream<A2, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, f: (a: A) => Iterable<A2>): Stream<A2, E, R>
} = internal.mapConcat

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatChunk: {
  <A, A2>(f: (a: A) => Chunk.Chunk<A2>): <E, R>(self: Stream<A, E, R>) => Stream<A2, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, f: (a: A) => Chunk.Chunk<A2>): Stream<A2, E, R>
} = internal.mapConcatChunk

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into the
 * output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatChunkEffect: {
  <A, A2, E2, R2>(
    f: (a: A) => Effect.Effect<Chunk.Chunk<A2>, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<Chunk.Chunk<A2>, E2, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.mapConcatChunkEffect

/**
 * Effectfully maps each element to an iterable, and flattens the iterables
 * into the output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatEffect: {
  <A, A2, E2, R2>(
    f: (a: A) => Effect.Effect<Iterable<A2>, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<Iterable<A2>, E2, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.mapConcatEffect

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapEffect: {
  <A, A2, E2, R2>(
    f: (a: A) => Effect.Effect<A2, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
      | undefined
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, A2, E2, R2, K>(
    f: (a: A) => Effect.Effect<A2, E2, R2>,
    options: { readonly key: (a: A) => K; readonly bufferSize?: number | undefined }
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<A2, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
      | undefined
  ): Stream<A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2, K>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<A2, E2, R2>,
    options: { readonly key: (a: A) => K; readonly bufferSize?: number | undefined }
  ): Stream<A2, E | E2, R | R2>
} = _groupBy.mapEffectOptions

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <A, R>(self: Stream<A, E, R>) => Stream<A, E2, R>
  <A, E, R, E2>(self: Stream<A, E, R>, f: (error: E) => E2): Stream<A, E2, R>
} = internal.mapError

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A, R>(self: Stream<A, E, R>) => Stream<A, E2, R>
  <A, E, R, E2>(self: Stream<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Stream<A, E2, R>
} = internal.mapErrorCause

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @since 2.0.0
 * @category utils
 */
export const merge: {
  <A2, E2, R2>(
    that: Stream<A2, E2, R2>,
    options?: { readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined } | undefined
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    options?: { readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined } | undefined
  ): Stream<A | A2, E | E2, R | R2>
} = internal.merge

/**
 * Merges a variable list of streams in a non-deterministic fashion. Up to `n`
 * streams may be consumed in parallel and up to `outputBuffer` chunks may be
 * buffered by this operator.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeAll: {
  (
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
    }
  ): <A, E, R>(streams: Iterable<Stream<A, E, R>>) => Stream<A, E, R>
  <A, E, R>(
    streams: Iterable<Stream<A, E, R>>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
    }
  ): Stream<A, E, R>
} = internal.mergeAll

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeWith: {
  <A2, E2, R2, A, A3, A4>(
    other: Stream<A2, E2, R2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): <E, R>(self: Stream<A, E, R>) => Stream<A3 | A4, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3, A4>(
    self: Stream<A, E, R>,
    other: Stream<A2, E2, R2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream<A3 | A4, E | E2, R | R2>
} = internal.mergeWith

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeEither: {
  <A2, E2, R2>(
    that: Stream<A2, E2, R2>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<Either.Either<A2, A>, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<Either.Either<A2, A>, E | E2, R | R2>
} = internal.mergeEither

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the right stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeLeft: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.mergeLeft

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the left stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeRight: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A2, E | E2, R | R2>
} = internal.mergeRight

/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mkString: <E, R>(self: Stream<string, E, R>) => Effect.Effect<string, E, R> = internal.mkString

/**
 * The stream that never produces any value or fails with any error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: Stream<never> = internal.never

/**
 * Runs the specified effect if this stream fails, providing the error to the
 * effect if it exists.
 *
 * Note: Unlike `Effect.onError` there is no guarantee that the provided
 * effect will not be interrupted.
 *
 * @since 2.0.0
 * @category utils
 */
export const onError: {
  <E, X, R2>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<X, never, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Stream<A, E, R>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<X, never, R2>
  ): Stream<A, E, R | R2>
} = internal.onError

/**
 * Runs the specified effect if this stream ends.
 *
 * @since 2.0.0
 * @category utils
 */
export const onDone: {
  <X, R2>(cleanup: () => Effect.Effect<X, never, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, X, R2>(self: Stream<A, E, R>, cleanup: () => Effect.Effect<X, never, R2>): Stream<A, E, R | R2>
} = internal.onDone

/**
 * Translates any failure into a stream termination, making the stream
 * infallible and all failures unchecked.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDie: <A, E, R>(self: Stream<A, E, R>) => Stream<A, never, R> = internal.orDie

/**
 * Keeps none of the errors, and terminates the stream with them, using the
 * specified function to convert the `E` into a defect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDieWith: {
  <E>(f: (e: E) => unknown): <A, R>(self: Stream<A, E, R>) => Stream<A, never, R>
  <A, E, R>(self: Stream<A, E, R>, f: (e: E) => unknown): Stream<A, never, R>
} = internal.orDieWith

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElse: {
  <A2, E2, R2>(that: LazyArg<Stream<A2, E2, R2>>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: LazyArg<Stream<A2, E2, R2>>): Stream<A | A2, E2, R | R2>
} = internal.orElse

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseEither: {
  <A2, E2, R2>(
    that: LazyArg<Stream<A2, E2, R2>>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<Either.Either<A2, A>, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    that: LazyArg<Stream<A2, E2, R2>>
  ): Stream<Either.Either<A2, A>, E2, R | R2>
} = internal.orElseEither

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseFail: {
  <E2>(error: LazyArg<E2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2, R>
  <A, E, R, E2>(self: Stream<A, E, R>, error: LazyArg<E2>): Stream<A, E2, R>
} = internal.orElseFail

/**
 * Produces the specified element if this stream is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmpty: {
  <A2>(element: LazyArg<A2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, element: LazyArg<A2>): Stream<A | A2, E, R>
} = internal.orElseIfEmpty

/**
 * Produces the specified chunk if this stream is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmptyChunk: {
  <A2>(chunk: LazyArg<Chunk.Chunk<A2>>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, chunk: LazyArg<Chunk.Chunk<A2>>): Stream<A | A2, E, R>
} = internal.orElseIfEmptyChunk

/**
 * Switches to the provided stream in case this one is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmptyStream: {
  <A2, E2, R2>(stream: LazyArg<Stream<A2, E2, R2>>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, stream: LazyArg<Stream<A2, E2, R2>>): Stream<A | A2, E | E2, R | R2>
} = internal.orElseIfEmptyStream

/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, never, R>
  <A, E, R, A2>(self: Stream<A, E, R>, value: LazyArg<A2>): Stream<A | A2, never, R>
} = internal.orElseSucceed

/**
 * Like `Stream.unfold`, but allows the emission of values to end one step further
 * than the unfolding of the state. This is useful for embedding paginated
 * APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginate: <S, A>(s: S, f: (s: S) => readonly [A, Option.Option<S>]) => Stream<A> = internal.paginate

/**
 * Like `Stream.unfoldChunk`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginateChunk: <S, A>(
  s: S,
  f: (s: S) => readonly [Chunk.Chunk<A>, Option.Option<S>]
) => Stream<A> = internal.paginateChunk

/**
 * Like `Stream.unfoldChunkEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginateChunkEffect: <S, A, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<readonly [Chunk.Chunk<A>, Option.Option<S>], E, R>
) => Stream<A, E, R> = internal.paginateChunkEffect

/**
 * Like `Stream.unfoldEffect` but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginateEffect: <S, A, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<readonly [A, Option.Option<S>], E, R>
) => Stream<A, E, R> = internal.paginateEffect

/**
 * Partition a stream using a predicate. The first stream will contain all
 * element evaluated to true and the second one will contain all element
 * evaluated to false. The faster stream may advance by up to buffer elements
 * further than the slower one.
 *
 * @since 2.0.0
 * @category utils
 */
export const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<NoInfer<A>, B>,
    options?: { bufferSize?: number | undefined } | undefined
  ): <E, R>(
    self: Stream<C, E, R>
  ) => Effect.Effect<[excluded: Stream<Exclude<C, B>, E, never>, satisfying: Stream<B, E, never>], E, R | Scope.Scope>
  <A>(
    predicate: Predicate<A>,
    options?: { bufferSize?: number | undefined } | undefined
  ): <E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<[excluded: Stream<A, E, never>, satisfying: Stream<A, E, never>], E, Scope.Scope | R>
  <C extends A, E, R, B extends A, A = C>(
    self: Stream<C, E, R>,
    refinement: Refinement<A, B>,
    options?: { bufferSize?: number | undefined } | undefined
  ): Effect.Effect<[excluded: Stream<Exclude<C, B>, E, never>, satisfying: Stream<B, E, never>], E, R | Scope.Scope>
  <A, E, R>(
    self: Stream<A, E, R>,
    predicate: Predicate<A>,
    options?: { bufferSize?: number | undefined } | undefined
  ): Effect.Effect<[excluded: Stream<A, E, never>, satisfying: Stream<A, E, never>], E, R | Scope.Scope>
} = internal.partition

/**
 * Split a stream by an effectful predicate. The faster stream may advance by
 * up to buffer elements further than the slower one.
 *
 * @since 2.0.0
 * @category utils
 */
export const partitionEither: {
  <A, A3, A2, E2, R2>(
    predicate: (a: NoInfer<A>) => Effect.Effect<Either.Either<A3, A2>, E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): <E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<[left: Stream<A2, E2 | E, never>, right: Stream<A3, E2 | E, never>], E2 | E, Scope.Scope | R2 | R>
  <A, E, R, A3, A2, E2, R2>(
    self: Stream<A, E, R>,
    predicate: (a: A) => Effect.Effect<Either.Either<A3, A2>, E2, R2>,
    options?: { readonly bufferSize?: number | undefined } | undefined
  ): Effect.Effect<[left: Stream<A2, E | E2, never>, right: Stream<A3, E | E2, never>], E | E2, Scope.Scope | R | R2>
} = internal.partitionEither

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a scope. Like all scoped values, the provided stream is
 * valid only within the scope.
 *
 * @since 2.0.0
 * @category utils
 */
export const peel: {
  <A2, A, E2, R2>(
    sink: Sink.Sink<A2, A, A, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<[A2, Stream<A, E, never>], E2 | E, Scope.Scope | R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    sink: Sink.Sink<A2, A, A, E2, R2>
  ): Effect.Effect<[A2, Stream<A, E, never>], E | E2, Scope.Scope | R | R2>
} = internal.peel

/**
 * Pipes all of the values from this stream through the provided sink.
 *
 * See also `Stream.transduce`.
 *
 * @since 2.0.0
 * @category utils
 */
export const pipeThrough: {
  <A2, A, L, E2, R2>(sink: Sink.Sink<A2, A, L, E2, R2>): <E, R>(self: Stream<A, E, R>) => Stream<L, E2 | E, R2 | R>
  <A, E, R, A2, L, E2, R2>(self: Stream<A, E, R>, sink: Sink.Sink<A2, A, L, E2, R2>): Stream<L, E | E2, R | R2>
} = internal.pipeThrough

/**
 * Pipes all the values from this stream through the provided channel.
 *
 * @since 2.0.0
 * @category utils
 */
export const pipeThroughChannel: {
  <R2, E, E2, A, A2>(
    channel: Channel.Channel<Chunk.Chunk<A2>, Chunk.Chunk<A>, E2, E, unknown, unknown, R2>
  ): <R>(self: Stream<A, E, R>) => Stream<A2, E2, R2 | R>
  <R, R2, E, E2, A, A2>(
    self: Stream<A, E, R>,
    channel: Channel.Channel<Chunk.Chunk<A2>, Chunk.Chunk<A>, E2, E, unknown, unknown, R2>
  ): Stream<A2, E2, R | R2>
} = internal.pipeThroughChannel

/**
 * Pipes all values from this stream through the provided channel, passing
 * through any error emitted by this stream unchanged.
 *
 * @since 2.0.0
 * @category utils
 */
export const pipeThroughChannelOrFail: {
  <R2, E, E2, A, A2>(
    chan: Channel.Channel<Chunk.Chunk<A2>, Chunk.Chunk<A>, E2, E, unknown, unknown, R2>
  ): <R>(self: Stream<A, E, R>) => Stream<A2, E | E2, R2 | R>
  <R, R2, E, E2, A, A2>(
    self: Stream<A, E, R>,
    chan: Channel.Channel<Chunk.Chunk<A2>, Chunk.Chunk<A>, E2, E, unknown, unknown, R2>
  ): Stream<A2, E | E2, R | R2>
} = internal.pipeThroughChannelOrFail

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @since 2.0.0
 * @category utils
 */
export const prepend: {
  <B>(values: Chunk.Chunk<B>): <A, E, R>(self: Stream<A, E, R>) => Stream<B | A, E, R>
  <A, E, R, B>(self: Stream<A, E, R>, values: Chunk.Chunk<B>): Stream<A | B, E, R>
} = internal.prepend

/**
 * Provides the stream with its required context, which eliminates its
 * dependency on `R`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(context: Context.Context<R>): <A, E>(self: Stream<A, E, R>) => Stream<A, E>
  <A, E, R>(self: Stream<A, E, R>, context: Context.Context<R>): Stream<A, E>
} = internal.provideContext

/**
 * Provides a `Layer` to the stream, which translates it to another level.
 *
 * @since 2.0.0
 * @category context
 */
export const provideLayer: {
  <RIn, E2, ROut>(layer: Layer.Layer<ROut, E2, RIn>): <A, E>(self: Stream<A, E, ROut>) => Stream<A, E2 | E, RIn>
  <A, E, RIn, E2, ROut>(self: Stream<A, E, ROut>, layer: Layer.Layer<ROut, E2, RIn>): Stream<A, E | E2, RIn>
} = internal.provideLayer

/**
 * Provides the stream with the single service it requires. If the stream
 * requires more than one service use `Stream.provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>>(
    self: Stream<A, E, R>,
    tag: T,
    resource: Context.Tag.Service<T>
  ): Stream<A, E, Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideService

/**
 * Provides the stream with the single service it requires. If the stream
 * requires more than one service use `Stream.provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, E2, R2>(
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E2, R2>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>, E2, R2>(
    self: Stream<A, E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E2, R2>
  ): Stream<A, E | E2, R2 | Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideServiceEffect

/**
 * Provides the stream with the single service it requires. If the stream
 * requires more than one service use `Stream.provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceStream: {
  <T extends Context.Tag<any, any>, E2, R2>(
    tag: T,
    stream: Stream<Context.Tag.Service<T>, E2, R2>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>, E2, R2>(
    self: Stream<A, E, R>,
    tag: T,
    stream: Stream<Context.Tag.Service<T>, E2, R2>
  ): Stream<A, E | E2, R2 | Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideServiceStream

/**
 * Transforms the context being provided to the stream with the specified
 * function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (env: Context.Context<R0>) => Context.Context<R>): <A, E>(self: Stream<A, E, R>) => Stream<A, E, R0>
  <A, E, R0, R>(self: Stream<A, E, R>, f: (env: Context.Context<R0>) => Context.Context<R>): Stream<A, E, R0>
} = internal.mapInputContext

/**
 * Splits the context into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideSomeLayer: {
  <RIn, E2, ROut>(
    layer: Layer.Layer<ROut, E2, RIn>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, RIn | Exclude<R, ROut>>
  <A, E, R, RIn, E2, ROut>(
    self: Stream<A, E, R>,
    layer: Layer.Layer<ROut, E2, RIn>
  ): Stream<A, E | E2, RIn | Exclude<R, ROut>>
} = internal.provideSomeLayer

/**
 * Constructs a stream from a range of integers, including both endpoints.
 *
 * @since 2.0.0
 * @category constructors
 */
export const range: (min: number, max: number, chunkSize?: number) => Stream<number> = internal.range

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each. The
 * last chunk might contain less than `n` elements.
 *
 * @since 2.0.0
 * @category utils
 */
export const rechunk: {
  (n: number): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, n: number): Stream<A, E, R>
} = internal.rechunk

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @since 2.0.0
 * @category error handling
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <A, R>(self: Stream<A, E, R>) => Stream<A, E2, R>
  <A, E, R, E2>(self: Stream<A, E, R>, pf: (error: E) => Option.Option<E2>): Stream<A, E2, R>
} = internal.refineOrDie

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a defect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const refineOrDieWith: {
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E2, R>
  <A, E, R, E2>(self: Stream<A, E, R>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): Stream<A, E2, R>
} = internal.refineOrDieWith

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeat: {
  <B, R2>(schedule: Schedule.Schedule<B, unknown, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, B, R2>(self: Stream<A, E, R>, schedule: Schedule.Schedule<B, unknown, R2>): Stream<A, E, R | R2>
} = internal.repeat

/**
 * Creates a stream from an effect producing a value of type `A` which repeats
 * forever.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream<A, E, R> = internal.repeatEffect

/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectChunk: <A, E, R>(effect: Effect.Effect<Chunk.Chunk<A>, E, R>) => Stream<A, E, R> =
  internal.repeatEffectChunk

/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectChunkOption: <A, E, R>(
  effect: Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R>
) => Stream<A, E, R> = internal.repeatEffectChunkOption

/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectOption: <A, E, R>(effect: Effect.Effect<A, Option.Option<E>, R>) => Stream<A, E, R> =
  internal.repeatEffectOption

/**
 * Creates a stream from an effect producing a value of type `A`, which is
 * repeated using the specified schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectWithSchedule: <A, E, R, X, A0 extends A, R2>(
  effect: Effect.Effect<A, E, R>,
  schedule: Schedule.Schedule<X, A0, R2>
) => Stream<A, E, R | R2> = internal.repeatEffectWithSchedule

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeatEither: {
  <B, R2>(
    schedule: Schedule.Schedule<B, unknown, R2>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<Either.Either<A, B>, E, R2 | R>
  <A, E, R, B, R2>(
    self: Stream<A, E, R>,
    schedule: Schedule.Schedule<B, unknown, R2>
  ): Stream<Either.Either<A, B>, E, R | R2>
} = internal.repeatEither

/**
 * Repeats each element of the stream using the provided schedule. Repetitions
 * are done in addition to the first execution, which means using
 * `Schedule.recurs(1)` actually results in the original effect, plus an
 * additional recurrence, for a total of two repetitions of each value in the
 * stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeatElements: {
  <B, R2>(schedule: Schedule.Schedule<B, unknown, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, B, R2>(self: Stream<A, E, R>, schedule: Schedule.Schedule<B, unknown, R2>): Stream<A, E, R | R2>
} = internal.repeatElements

/**
 * Repeats each element of the stream using the provided schedule. When the
 * schedule is finished, then the output of the schedule will be emitted into
 * the stream. Repetitions are done in addition to the first execution, which
 * means using `Schedule.recurs(1)` actually results in the original effect,
 * plus an additional recurrence, for a total of two repetitions of each value
 * in the stream.
 *
 * This function accepts two conversion functions, which allow the output of
 * this stream and the output of the provided schedule to be unified into a
 * single type. For example, `Either` or similar data type.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeatElementsWith: {
  <B, R2, A, C>(
    schedule: Schedule.Schedule<B, unknown, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <E, R>(self: Stream<A, E, R>) => Stream<C, E, R2 | R>
  <A, E, R, B, R2, C>(
    self: Stream<A, E, R>,
    schedule: Schedule.Schedule<B, unknown, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<C, E, R | R2>
} = internal.repeatElementsWith

/**
 * Repeats the provided value infinitely.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatValue: <A>(value: A) => Stream<A> = internal.repeatValue

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition and can
 * be unified with the stream elements using the provided functions.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeatWith: {
  <B, R2, A, C>(
    schedule: Schedule.Schedule<B, unknown, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <E, R>(self: Stream<A, E, R>) => Stream<C, E, R2 | R>
  <A, E, R, B, R2, C>(
    self: Stream<A, E, R>,
    schedule: Schedule.Schedule<B, unknown, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<C, E, R | R2>
} = internal.repeatWith

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's
 * acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the
 * stream again.
 *
 * @param schedule A `Schedule` receiving as input the errors of the stream.
 * @since 2.0.0
 * @category utils
 */
export const retry: {
  <E0 extends E, R2, E, X>(
    schedule: Schedule.Schedule<X, E0, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, X, E0 extends E, R2>(self: Stream<A, E, R>, schedule: Schedule.Schedule<X, E0, R2>): Stream<A, E, R | R2>
} = internal.retry

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @since 2.0.0
 * @category destructors
 */
export const run: {
  <A2, A, E2, R2>(
    sink: Sink.Sink<A2, A, unknown, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    sink: Sink.Sink<A2, A, unknown, E2, R2>
  ): Effect.Effect<A2, E | E2, R | R2>
} = internal.run

/**
 * Runs the stream and collects all of its elements to a chunk.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runCollect: <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Chunk.Chunk<A>, E, R> = internal.runCollect

/**
 * Runs the stream and emits the number of elements processed
 *
 * @since 2.0.0
 * @category destructors
 */
export const runCount: <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<number, E, R> = internal.runCount

/**
 * Runs the stream only for its effects. The emitted elements are discarded.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runDrain: <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E, R> = internal.runDrain

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFold: {
  <S, A>(s: S, f: (s: S, a: A) => S): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E, R>
  <A, E, R, S>(self: Stream<A, E, R>, s: S, f: (s: S, a: A) => S): Effect.Effect<S, E, R>
} = internal.runFold

/**
 * Executes an effectful fold over the stream of values.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldEffect: {
  <S, A, E2, R2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E2 | E, R2 | R>
  <A, E, R, S, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): Effect.Effect<S, E | E2, R | R2>
} = internal.runFoldEffect

/**
 * Executes a pure fold over the stream of values. Returns a scoped value that
 * represents the scope of the stream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldScoped: {
  <S, A>(s: S, f: (s: S, a: A) => S): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E, Scope.Scope | R>
  <A, E, R, S>(self: Stream<A, E, R>, s: S, f: (s: S, a: A) => S): Effect.Effect<S, E, Scope.Scope | R>
} = internal.runFoldScoped

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldScopedEffect: {
  <S, A, E2, R2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E2 | E, Scope.Scope | R2 | R>
  <A, E, R, S, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): Effect.Effect<S, E | E2, Scope.Scope | R | R2>
} = internal.runFoldScopedEffect

/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled. Example:
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhile: {
  <S, A>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E, R>
  <A, E, R, S>(self: Stream<A, E, R>, s: S, cont: Predicate<S>, f: (s: S, a: A) => S): Effect.Effect<S, E, R>
} = internal.runFoldWhile

/**
 * Executes an effectful fold over the stream of values. Stops the fold early
 * when the condition is not fulfilled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhileEffect: {
  <S, A, E2, R2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E2 | E, R2 | R>
  <A, E, R, S, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): Effect.Effect<S, E | E2, R | R2>
} = internal.runFoldWhileEffect

/**
 * Executes a pure fold over the stream of values. Returns a scoped value that
 * represents the scope of the stream. Stops the fold early when the condition
 * is not fulfilled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhileScoped: {
  <S, A>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E, Scope.Scope | R>
  <A, E, R, S>(
    self: Stream<A, E, R>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ): Effect.Effect<S, E, Scope.Scope | R>
} = internal.runFoldWhileScoped

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream. Stops the fold early when
 * the condition is not fulfilled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhileScopedEffect: {
  <S, A, E2, R2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<S, E2 | E, R2 | R | Scope.Scope>
  <A, E, R, S, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): Effect.Effect<S, E | E2, Scope.Scope | R | R2>
} = internal.runFoldWhileScopedEffect

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEach: {
  <A, X, E2, R2>(
    f: (a: A) => Effect.Effect<X, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<X, E2, R2>
  ): Effect.Effect<void, E | E2, R | R2>
} = internal.runForEach

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachChunk: {
  <A, X, E2, R2>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<X, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<X, E2, R2>
  ): Effect.Effect<void, E | E2, R | R2>
} = internal.runForEachChunk

/**
 * Like `Stream.runForEachChunk`, but returns a scoped effect so the
 * finalization order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachChunkScoped: {
  <A, X, E2, R2>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<X, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, Scope.Scope | R2 | R>
  <A, E, R, X, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<X, E2, R2>
  ): Effect.Effect<void, E | E2, Scope.Scope | R | R2>
} = internal.runForEachChunkScoped

/**
 * Like `Stream.forEach`, but returns a scoped effect so the finalization
 * order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachScoped: {
  <A, X, E2, R2>(
    f: (a: A) => Effect.Effect<X, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, Scope.Scope | R2 | R>
  <A, E, R, X, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<X, E2, R2>
  ): Effect.Effect<void, E | E2, Scope.Scope | R | R2>
} = internal.runForEachScoped

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachWhile: {
  <A, E2, R2>(
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Effect.Effect<void, E | E2, R | R2>
} = internal.runForEachWhile

/**
 * Like `Stream.runForEachWhile`, but returns a scoped effect so the
 * finalization order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachWhileScoped: {
  <A, E2, R2>(
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<void, E2 | E, Scope.Scope | R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    f: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Effect.Effect<void, E | E2, Scope.Scope | R | R2>
} = internal.runForEachWhileScoped

/**
 * Runs the stream to completion and yields the first value emitted by it,
 * discarding the rest of the elements.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runHead: <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Option.Option<A>, E, R> = internal.runHead

/**
 * Publishes elements of this stream to a `PubSub`. Stream failure and ending will
 * also be signalled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoPubSub: {
  <A, E>(pubsub: PubSub.PubSub<Take.Take<A, E>>): <R>(self: Stream<A, E, R>) => Effect.Effect<void, never, R>
  <A, E, R>(self: Stream<A, E, R>, pubsub: PubSub.PubSub<Take.Take<A, E>>): Effect.Effect<void, never, R>
} = internal.runIntoPubSub

/**
 * Like `Stream.runIntoPubSub`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoPubSubScoped: {
  <A, E>(
    pubsub: PubSub.PubSub<Take.Take<A, E>>
  ): <R>(self: Stream<A, E, R>) => Effect.Effect<void, never, Scope.Scope | R>
  <A, E, R>(self: Stream<A, E, R>, pubsub: PubSub.PubSub<Take.Take<A, E>>): Effect.Effect<void, never, Scope.Scope | R>
} = internal.runIntoPubSubScoped

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueue: {
  <A, E>(queue: Queue.Enqueue<Take.Take<A, E>>): <R>(self: Stream<A, E, R>) => Effect.Effect<void, never, R>
  <A, E, R>(self: Stream<A, E, R>, queue: Queue.Enqueue<Take.Take<A, E>>): Effect.Effect<void, never, R>
} = internal.runIntoQueue

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped [[ZIO]]
 * to allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueueElementsScoped: {
  <A, E>(
    queue: Queue.Enqueue<Exit.Exit<A, Option.Option<E>>>
  ): <R>(self: Stream<A, E, R>) => Effect.Effect<void, never, Scope.Scope | R>
  <A, E, R>(
    self: Stream<A, E, R>,
    queue: Queue.Enqueue<Exit.Exit<A, Option.Option<E>>>
  ): Effect.Effect<void, never, Scope.Scope | R>
} = internal.runIntoQueueElementsScoped

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect
 * to allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueueScoped: {
  <A, E>(
    queue: Queue.Enqueue<Take.Take<A, E>>
  ): <R>(self: Stream<A, E, R>) => Effect.Effect<void, never, Scope.Scope | R>
  <A, E, R>(self: Stream<A, E, R>, queue: Queue.Enqueue<Take.Take<A, E>>): Effect.Effect<void, never, Scope.Scope | R>
} = internal.runIntoQueueScoped

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runLast: <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Option.Option<A>, E, R> = internal.runLast

/**
 * @since 2.0.0
 * @category destructors
 */
export const runScoped: {
  <A2, A, E2, R2>(
    sink: Sink.Sink<A2, A, unknown, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Effect.Effect<A2, E2 | E, Scope.Scope | R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    sink: Sink.Sink<A2, A, unknown, E2, R2>
  ): Effect.Effect<A2, E | E2, Scope.Scope | R | R2>
} = internal.runScoped

/**
 * Runs the stream to a sink which sums elements, provided they are Numeric.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runSum: <E, R>(self: Stream<number, E, R>) => Effect.Effect<number, E, R> = internal.runSum

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @since 2.0.0
 * @category utils
 */
export const scan: {
  <S, A>(s: S, f: (s: S, a: A) => S): <E, R>(self: Stream<A, E, R>) => Stream<S, E, R>
  <A, E, R, S>(self: Stream<A, E, R>, s: S, f: (s: S, a: A) => S): Stream<S, E, R>
} = internal.scan

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results of type `S` given an initial S.
 *
 * @since 2.0.0
 * @category utils
 */
export const scanEffect: {
  <S, A, E2, R2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<S, E2 | E, R2 | R>
  <A, E, R, S, E2, R2>(
    self: Stream<A, E, R>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<S, E2, R2>
  ): Stream<S, E | E2, R | R2>
} = internal.scanEffect

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream.scan`.
 *
 * @since 2.0.0
 * @category utils
 */
export const scanReduce: {
  <A2, A>(f: (a2: A2 | A, a: A) => A2): <E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E, R>
  <A, E, R, A2>(self: Stream<A, E, R>, f: (a2: A | A2, a: A) => A2): Stream<A | A2, E, R>
} = internal.scanReduce

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * See also `Stream.scanEffect`.
 *
 * @since 2.0.0
 * @category utils
 */
export const scanReduceEffect: {
  <A2, A, E2, R2>(
    f: (a2: A2 | A, a: A) => Effect.Effect<A2 | A, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    f: (a2: A | A2, a: A) => Effect.Effect<A | A2, E2, R2>
  ): Stream<A | A2, E | E2, R | R2>
} = internal.scanReduceEffect

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @since 2.0.0
 * @category utils
 */
export const schedule: {
  <X, A0 extends A, R2, A>(
    schedule: Schedule.Schedule<X, A0, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R2 | R>
  <A, E, R, X, A0 extends A, R2>(self: Stream<A, E, R>, schedule: Schedule.Schedule<X, A0, R2>): Stream<A, E, R | R2>
} = internal.schedule

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite). Uses the provided function
 * to align the stream and schedule outputs on the same type.
 *
 * @since 2.0.0
 * @category utils
 */
export const scheduleWith: {
  <B, A0 extends A, R2, A, C>(
    schedule: Schedule.Schedule<B, A0, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <E, R>(self: Stream<A, E, R>) => Stream<C, E, R2 | R>
  <A, E, R, B, A0 extends A, R2, C>(
    self: Stream<A, E, R>,
    schedule: Schedule.Schedule<B, A0, R2>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<C, E, R | R2>
} = internal.scheduleWith

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @since 2.0.0
 * @category constructors
 */
export const scoped: <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream<A, E, Exclude<R, Scope.Scope>> =
  internal.scoped

/**
 * Emits a sliding window of `n` elements.
 *
 * ```ts
 * import * as Stream from "./Stream"
 * import { pipe } from "./Function"
 *
 * pipe(
 *   Stream.make(1, 2, 3, 4),
 *   Stream.sliding(2),
 *   Stream.runCollect
 * )
 * // => Chunk(Chunk(1, 2), Chunk(2, 3), Chunk(3, 4))
 * ```
 *
 * @since 2.0.0
 * @category utils
 */
export const sliding: {
  (chunkSize: number): <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, chunkSize: number): Stream<Chunk.Chunk<A>, E, R>
} = internal.sliding

/**
 * Like `sliding`, but with a configurable `stepSize` parameter.
 *
 * @since 2.0.0
 * @category utils
 */
export const slidingSize: {
  (chunkSize: number, stepSize: number): <A, E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, chunkSize: number, stepSize: number): Stream<Chunk.Chunk<A>, E, R>
} = internal.slidingSize

/**
 * Converts an option on values into an option on errors.
 *
 * @since 2.0.0
 * @category utils
 */
export const some: <A, E, R>(self: Stream<Option.Option<A>, E, R>) => Stream<A, Option.Option<E>, R> = internal.some

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @since 2.0.0
 * @category utils
 */
export const someOrElse: {
  <A2>(fallback: LazyArg<A2>): <A, E, R>(self: Stream<Option.Option<A>, E, R>) => Stream<A2 | A, E, R>
  <A, E, R, A2>(self: Stream<Option.Option<A>, E, R>, fallback: LazyArg<A2>): Stream<A | A2, E, R>
} = internal.someOrElse

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @since 2.0.0
 * @category utils
 */
export const someOrFail: {
  <E2>(error: LazyArg<E2>): <A, E, R>(self: Stream<Option.Option<A>, E, R>) => Stream<A, E2 | E, R>
  <A, E, R, E2>(self: Stream<Option.Option<A>, E, R>, error: LazyArg<E2>): Stream<A, E | E2, R>
} = internal.someOrFail

/**
 * Splits elements based on a predicate.
 *
 * ```ts
 * import * as Stream from "./Stream"
 * import { pipe } from "./Function"
 *
 * pipe(
 *   Stream.range(1, 10),
 *   Stream.split((n) => n % 4 === 0),
 *   Stream.runCollect
 * )
 * // => Chunk(Chunk(1, 2, 3), Chunk(5, 6, 7), Chunk(9))
 * ```
 *
 * @since 2.0.0
 * @category utils
 */
export const split: {
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<Chunk.Chunk<A>, E, R>
} = internal.split

/**
 * Splits elements on a delimiter and transforms the splits into desired output.
 *
 * @since 2.0.0
 * @category utils
 */
export const splitOnChunk: {
  <A>(delimiter: Chunk.Chunk<A>): <E, R>(self: Stream<A, E, R>) => Stream<Chunk.Chunk<A>, E, R>
  <A, E, R>(self: Stream<A, E, R>, delimiter: Chunk.Chunk<A>): Stream<Chunk.Chunk<A>, E, R>
} = internal.splitOnChunk

/**
 * Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
 * newlines (`\n`).
 *
 * @since 2.0.0
 * @category combinators
 */
export const splitLines: <E, R>(self: Stream<string, E, R>) => Stream<string, E, R> = internal.splitLines

/**
 * Creates a single-valued pure stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Stream<A> = internal.succeed

/**
 * Creates a single-valued pure stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Stream<A> = internal.sync

/**
 * Returns a lazily constructed stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <A, E, R>(stream: LazyArg<Stream<A, E, R>>) => Stream<A, E, R> = internal.suspend

/**
 * Takes the specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const take: {
  (n: number): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, n: number): Stream<A, E, R>
} = internal.take

/**
 * Takes the last specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeRight: {
  (n: number): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, n: number): Stream<A, E, R>
} = internal.takeRight

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeUntil: {
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.takeUntil

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeUntilEffect: {
  <A, E2, R2>(
    predicate: (a: NoInfer<A>) => Effect.Effect<boolean, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    predicate: (a: A) => Effect.Effect<boolean, E2, R2>
  ): Stream<A, E | E2, R | R2>
} = internal.takeUntilEffect

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeWhile: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R>
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R, B extends A>(self: Stream<A, E, R>, refinement: Refinement<A, B>): Stream<B, E, R>
  <A, E, R>(self: Stream<A, E, R>, predicate: Predicate<A>): Stream<A, E, R>
} = internal.takeWhile

/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X, E2, R2>(
    f: (a: NoInfer<A>) => Effect.Effect<X, E2, R2>
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(self: Stream<A, E, R>, f: (a: NoInfer<A>) => Effect.Effect<X, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.tap

/**
 * Returns a stream that effectfully "peeks" at the failure or success of
 * the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <E, X1, E2, R2, A, X2, E3, R3>(
    options: {
      readonly onFailure: (e: NoInfer<E>) => Effect.Effect<X1, E2, R2>
      readonly onSuccess: (a: NoInfer<A>) => Effect.Effect<X2, E3, R3>
    }
  ): <R>(self: Stream<A, E, R>) => Stream<A, E | E2 | E3, R2 | R3 | R>
  <A, E, R, X1, E2, R2, X2, E3, R3>(
    self: Stream<A, E, R>,
    options: {
      readonly onFailure: (e: NoInfer<E>) => Effect.Effect<X1, E2, R2>
      readonly onSuccess: (a: NoInfer<A>) => Effect.Effect<X2, E3, R3>
    }
  ): Stream<A, E | E2 | E3, R | R2 | R3>
} = internal.tapBoth

/**
 * Returns a stream that effectfully "peeks" at the failure of the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, X, E2, R2>(
    f: (error: NoInfer<E>) => Effect.Effect<X, E2, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(self: Stream<A, E, R>, f: (error: E) => Effect.Effect<X, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.tapError

/**
 * Returns a stream that effectfully "peeks" at the cause of failure of the
 * stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const tapErrorCause: {
  <E, X, E2, R2>(
    f: (cause: Cause.Cause<NoInfer<E>>) => Effect.Effect<X, E2, R2>
  ): <A, R>(self: Stream<A, E, R>) => Stream<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(
    self: Stream<A, E, R>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<X, E2, R2>
  ): Stream<A, E | E2, R | R2>
} = internal.tapErrorCause

/**
 * Sends all elements emitted by this stream to the specified sink in addition
 * to emitting them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapSink: {
  <A, E2, R2>(sink: Sink.Sink<unknown, A, unknown, E2, R2>): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Stream<A, E, R>, sink: Sink.Sink<unknown, A, unknown, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.tapSink

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` function.
 *
 * If using the "enforce" strategy, chunks that do not meet the bandwidth
 * constraints are dropped. If using the "shape" strategy, chunks are delayed
 * until they can be emitted without exceeding the bandwidth constraints.
 *
 * Defaults to the "shape" strategy.
 *
 * @since 2.0.0
 * @category utils
 */
export const throttle: {
  <A>(
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<A, E, R>
} = internal.throttle

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the effectful `costFn` function.
 *
 * If using the "enforce" strategy, chunks that do not meet the bandwidth
 * constraints are dropped. If using the "shape" strategy, chunks are delayed
 * until they can be emitted without exceeding the bandwidth constraints.
 *
 * Defaults to the "shape" strategy.
 *
 * @since 2.0.0
 * @category utils
 */
export const throttleEffect: {
  <A, E2, R2>(
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<number, E2, R2>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: Stream<A, E, R>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<number, E2, R2>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<A, E | E2, R | R2>
} = internal.throttleEffect

/**
 * A stream that emits void values spaced by the specified duration.
 *
 * @since 2.0.0
 * @category constructors
 */
export const tick: (interval: Duration.DurationInput) => Stream<void> = internal.tick

/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeout: {
  (duration: Duration.DurationInput): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, duration: Duration.DurationInput): Stream<A, E, R>
} = internal.timeout

/**
 * Fails the stream with given error if it does not produce a value after d
 * duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeoutFail: {
  <E2>(error: LazyArg<E2>, duration: Duration.DurationInput): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R>
  <A, E, R, E2>(self: Stream<A, E, R>, error: LazyArg<E2>, duration: Duration.DurationInput): Stream<A, E | E2, R>
} = internal.timeoutFail

/**
 * Fails the stream with given cause if it does not produce a value after d
 * duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeoutFailCause: {
  <E2>(
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R>
  <A, E, R, E2>(
    self: Stream<A, E, R>,
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): Stream<A, E | E2, R>
} = internal.timeoutFailCause

/**
 * Switches the stream if it does not produce a value after the specified
 * duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeoutTo: {
  <A2, E2, R2>(
    duration: Duration.DurationInput,
    that: Stream<A2, E2, R2>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    duration: Duration.DurationInput,
    that: Stream<A2, E2, R2>
  ): Stream<A | A2, E | E2, R | R2>
} = internal.timeoutTo

/**
 * Converts the stream to a scoped `PubSub` of chunks. After the scope is closed,
 * the `PubSub` will never again produce values and should be discarded.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toPubSub: {
  (
    capacity: number
  ): <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<PubSub.PubSub<Take.Take<A, E>>, never, Scope.Scope | R>
  <A, E, R>(
    self: Stream<A, E, R>,
    capacity: number
  ): Effect.Effect<PubSub.PubSub<Take.Take<A, E>>, never, Scope.Scope | R>
} = internal.toPubSub

/**
 * Returns in a scope a ZIO effect that can be used to repeatedly pull chunks
 * from the stream. The pull effect fails with None when the stream is
 * finished, or with Some error if it fails, otherwise it returns a chunk of
 * the stream's output.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toPull: <A, E, R>(
  self: Stream<A, E, R>
) => Effect.Effect<Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R>, never, Scope.Scope | R> = internal.toPull

/**
 * Converts the stream to a scoped queue of chunks. After the scope is closed,
 * the queue will never again produce values and should be discarded.
 *
 * Defaults to the "suspend" back pressure strategy with a capacity of 2.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toQueue: {
  (
    options?:
      | { readonly strategy?: "dropping" | "sliding" | "suspend" | undefined; readonly capacity?: number | undefined }
      | { readonly strategy: "unbounded" }
      | undefined
  ): <A, E, R>(self: Stream<A, E, R>) => Effect.Effect<Queue.Dequeue<Take.Take<A, E>>, never, Scope.Scope | R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options?:
      | { readonly strategy?: "dropping" | "sliding" | "suspend" | undefined; readonly capacity?: number | undefined }
      | { readonly strategy: "unbounded" }
      | undefined
  ): Effect.Effect<Queue.Dequeue<Take.Take<A, E>>, never, Scope.Scope | R>
} = internal.toQueue

/**
 * Converts the stream to a scoped queue of elements. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * Defaults to a capacity of 2.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toQueueOfElements: {
  (
    options?: { readonly capacity?: number | undefined } | undefined
  ): <A, E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>, never, Scope.Scope | R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options?: { readonly capacity?: number | undefined } | undefined
  ): Effect.Effect<Queue.Dequeue<Exit.Exit<A, Option.Option<E>>>, never, Scope.Scope | R>
} = internal.toQueueOfElements

/**
 * Converts the stream to a `ReadableStream`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toReadableStream: {
  <A>(
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): <E>(
    self: Stream<A, E>
  ) => ReadableStream<A>
  <A, E>(
    self: Stream<A, E>,
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): ReadableStream<A>
} = internal.toReadableStream

/**
 * Converts the stream to a `Effect<ReadableStream>`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toReadableStreamEffect: {
  <A>(
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): <E, R>(
    self: Stream<A, E, R>
  ) => Effect.Effect<ReadableStream<A>, never, R>
  <A, E, R>(
    self: Stream<A, E, R>,
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): Effect.Effect<ReadableStream<A>, never, R>
} = internal.toReadableStreamEffect

/**
 * Converts the stream to a `ReadableStream` using the provided runtime.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toReadableStreamRuntime: {
  <A, XR>(
    runtime: Runtime<XR>,
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): <E, R extends XR>(self: Stream<A, E, R>) => ReadableStream<A>
  <A, E, XR, R extends XR>(
    self: Stream<A, E, R>,
    runtime: Runtime<XR>,
    options?: { readonly strategy?: QueuingStrategy<A> | undefined }
  ): ReadableStream<A>
} = internal.toReadableStreamRuntime

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @since 2.0.0
 * @category utils
 */
export const transduce: {
  <A2, A, E2, R2>(sink: Sink.Sink<A2, A, A, E2, R2>): <E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, sink: Sink.Sink<A2, A, A, E2, R2>): Stream<A2, E | E2, R | R2>
} = internal.transduce

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfold: <S, A>(s: S, f: (s: S) => Option.Option<readonly [A, S]>) => Stream<A> = internal.unfold

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldChunk: <S, A>(
  s: S,
  f: (s: S) => Option.Option<readonly [Chunk.Chunk<A>, S]>
) => Stream<A> = internal.unfoldChunk

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldChunkEffect: <S, A, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<Option.Option<readonly [Chunk.Chunk<A>, S]>, E, R>
) => Stream<A, E, R> = internal.unfoldChunkEffect

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldEffect: <S, A, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<Option.Option<readonly [A, S]>, E, R>
) => Stream<A, E, R> = internal.unfoldEffect

const void_: Stream<void> = internal.void
export {
  /**
   * A stream that contains a single `void` value.
   *
   * @since 2.0.0
   * @category constructors
   */
  void_ as void
}

/**
 * Creates a stream produced from an `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrap: <A, E2, R2, E, R>(effect: Effect.Effect<Stream<A, E2, R2>, E, R>) => Stream<A, E | E2, R | R2> =
  internal.unwrap

/**
 * Creates a stream produced from a scoped `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrapScoped: <A, E2, R2, E, R>(
  effect: Effect.Effect<Stream<A, E2, R2>, E, R>
) => Stream<A, E | E2, R2 | Exclude<R, Scope.Scope>> = internal.unwrapScoped

/**
 * Updates the specified service within the context of the `Stream`.
 *
 * @since 2.0.0
 * @category context
 */
export const updateService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, T | R>
  <A, E, R, T extends Context.Tag<any, any>>(
    self: Stream<A, E, R>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): Stream<A, E, R | T>
} = internal.updateService

/**
 * Returns the specified stream if the given condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const when: {
  (test: LazyArg<boolean>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, R>
  <A, E, R>(self: Stream<A, E, R>, test: LazyArg<boolean>): Stream<A, E, R>
} = internal.when

/**
 * Returns the resulting stream when the given `PartialFunction` is defined
 * for the given value, otherwise returns an empty stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const whenCase: <A, A2, E, R>(
  evaluate: LazyArg<A>,
  pf: (a: A) => Option.Option<Stream<A2, E, R>>
) => Stream<A2, E, R> = internal.whenCase

/**
 * Returns the stream when the given partial function is defined for the given
 * effectful value, otherwise returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const whenCaseEffect: {
  <A, A2, E2, R2>(
    pf: (a: A) => Option.Option<Stream<A2, E2, R2>>
  ): <E, R>(self: Effect.Effect<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect.Effect<A, E, R>,
    pf: (a: A) => Option.Option<Stream<A2, E2, R2>>
  ): Stream<A2, E | E2, R | R2>
} = internal.whenCaseEffect

/**
 * Returns the stream if the given effectful condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const whenEffect: {
  <E2, R2>(effect: Effect.Effect<boolean, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Stream<A, E, R>, effect: Effect.Effect<boolean, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.whenEffect

/**
 * Wraps the stream with a new span for tracing.
 *
 * @since 2.0.0
 * @category tracing
 */
export const withSpan: {
  (
    name: string,
    options?: Tracer.SpanOptions | undefined
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E, Exclude<R, Tracer.ParentSpan>>
  <A, E, R>(
    self: Stream<A, E, R>,
    name: string,
    options?: Tracer.SpanOptions | undefined
  ): Stream<A, E, Exclude<R, Tracer.ParentSpan>>
} = internal.withSpan

/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<[A, A2], E | E2, R | R2>
} = internal.zip

/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipFlatten: {
  <A2, E2, R2>(
    that: Stream<A2, E2, R2>
  ): <A extends ReadonlyArray<any>, E, R>(self: Stream<A, E, R>) => Stream<[...A, A2], E2 | E, R2 | R>
  <A extends ReadonlyArray<any>, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>
  ): Stream<[...A, A2], E | E2, R | R2>
} = internal.zipFlatten

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of
 * elements from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams
 * have different lengths and one of the streams has ended before the other.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAll: {
  <A2, E2, R2, A>(
    options: { readonly other: Stream<A2, E2, R2>; readonly defaultSelf: A; readonly defaultOther: A2 }
  ): <E, R>(self: Stream<A, E, R>) => Stream<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Stream<A, E, R>,
    options: { readonly other: Stream<A2, E2, R2>; readonly defaultSelf: A; readonly defaultOther: A2 }
  ): Stream<[A, A2], E | E2, R | R2>
} = internal.zipAll

/**
 * Zips this stream with another point-wise, and keeps only elements from this
 * stream.
 *
 * The provided default value will be used if the other stream ends before
 * this one.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllLeft: {
  <A2, E2, R2, A>(that: Stream<A2, E2, R2>, defaultLeft: A): <E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>, defaultLeft: A): Stream<A, E | E2, R | R2>
} = internal.zipAllLeft

/**
 * Zips this stream with another point-wise, and keeps only elements from the
 * other stream.
 *
 * The provided default value will be used if this stream ends before the
 * other one.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllRight: {
  <A2, E2, R2>(
    that: Stream<A2, E2, R2>,
    defaultRight: A2
  ): <A, E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>, defaultRight: A2): Stream<A2, E | E2, R | R2>
} = internal.zipAllRight

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Combines values associated with each key into a tuple,
 * using the specified values `defaultLeft` and `defaultRight` to fill in
 * missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllSortedByKey: {
  <A2, E2, R2, A, K>(
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): <E, R>(self: Stream<readonly [K, A], E, R>) => Stream<[K, [A, A2]], E2 | E, R2 | R>
  <K, A, E, R, A2, E2, R2>(
    self: Stream<readonly [K, A], E, R>,
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<[K, [A, A2]], E | E2, R | R2>
} = internal.zipAllSortedByKey

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Keeps only values from this stream, using the specified
 * value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllSortedByKeyLeft: {
  <A2, E2, R2, A, K>(
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): <E, R>(self: Stream<readonly [K, A], E, R>) => Stream<[K, A], E2 | E, R2 | R>
  <K, A, E, R, A2, E2, R2>(
    self: Stream<readonly [K, A], E, R>,
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): Stream<[K, A], E | E2, R | R2>
} = internal.zipAllSortedByKeyLeft

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Keeps only values from that stream, using the specified
 * value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllSortedByKeyRight: {
  <K, A2, E2, R2>(
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): <A, E, R>(self: Stream<readonly [K, A], E, R>) => Stream<[K, A2], E2 | E, R2 | R>
  <A, E, R, K, A2, E2, R2>(
    self: Stream<readonly [K, A], E, R>,
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<[K, A2], E | E2, R | R2>
} = internal.zipAllSortedByKeyRight

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Uses the functions `left`, `right`, and `both` to handle
 * the cases where a key and value exist in this stream, that stream, or
 * both streams.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllSortedByKeyWith: {
  <K, A2, E2, R2, A, A3>(
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): <E, R>(self: Stream<readonly [K, A], E, R>) => Stream<[K, A3], E2 | E, R2 | R>
  <K, A, E, R, A2, E2, R2, A3>(
    self: Stream<readonly [K, A], E, R>,
    options: {
      readonly other: Stream<readonly [K, A2], E2, R2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): Stream<[K, A3], E | E2, R | R2>
} = internal.zipAllSortedByKeyWith

/**
 * Zips this stream with another point-wise. The provided functions will be
 * used to create elements for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different
 * lengths and one of the streams has ended before the other.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipAllWith: {
  <A2, E2, R2, A, A3>(
    options: {
      readonly other: Stream<A2, E2, R2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): <E, R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3>(
    self: Stream<A, E, R>,
    options: {
      readonly other: Stream<A2, E2, R2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): Stream<A3, E | E2, R | R2>
} = internal.zipAllWith

/**
 * Zips the two streams so that when a value is emitted by either of the two
 * streams, it is combined with the latest value from the other stream to
 * produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLatest: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<[A, A2], E | E2, R | R2>
} = internal.zipLatest

/**
 * Zips multiple streams so that when a value is emitted by any of the streams,
 * it is combined with the latest values from the other streams to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 *
 * @example
 * import { Stream, Schedule, Console, Effect } from "effect"
 *
 * const stream = Stream.zipLatestAll(
 *     Stream.fromSchedule(Schedule.spaced('1 millis')),
 *     Stream.fromSchedule(Schedule.spaced('2 millis')),
 *     Stream.fromSchedule(Schedule.spaced('4 millis')),
 * ).pipe(Stream.take(6), Stream.tap(Console.log))
 *
 * Effect.runPromise(Stream.runDrain(stream))
 * // Output:
 * // [ 0, 0, 0 ]
 * // [ 1, 0, 0 ]
 * // [ 1, 1, 0 ]
 * // [ 2, 1, 0 ]
 * // [ 3, 1, 0 ]
 * // [ 3, 1, 1 ]
 * // .....
 *
 * @since 3.3.0
 * @category zipping
 */
export const zipLatestAll: <T extends ReadonlyArray<Stream<any, any, any>>>(
  ...streams: T
) => Stream<
  [T[number]] extends [never] ? never
    : { [K in keyof T]: T[K] extends Stream<infer A, infer _E, infer _R> ? A : never },
  [T[number]] extends [never] ? never : T[number] extends Stream<infer _A, infer _E, infer _R> ? _E : never,
  [T[number]] extends [never] ? never : T[number] extends Stream<infer _A, infer _E, infer _R> ? _R : never
> = internal.zipLatestAll

/**
 * Zips the two streams so that when a value is emitted by either of the two
 * streams, it is combined with the latest value from the other stream to
 * produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLatestWith: {
  <A2, E2, R2, A, A3>(
    that: Stream<A2, E2, R2>,
    f: (a: A, a2: A2) => A3
  ): <E, R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    f: (a: A, a2: A2) => A3
  ): Stream<A3, E | E2, R | R2>
} = internal.zipLatestWith

/**
 * Zips this stream with another point-wise, but keeps only the outputs of
 * this stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A, E | E2, R | R2>
} = internal.zipLeft

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the
 * other stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <A2, E2, R2>(that: Stream<A2, E2, R2>): <A, E, R>(self: Stream<A, E, R>) => Stream<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Stream<A, E, R>, that: Stream<A2, E2, R2>): Stream<A2, E | E2, R | R2>
} = internal.zipRight

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <A2, E2, R2, A, A3>(
    that: Stream<A2, E2, R2>,
    f: (a: A, a2: A2) => A3
  ): <E, R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    f: (a: A, a2: A2) => A3
  ): Stream<A3, E | E2, R | R2>
} = internal.zipWith

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithChunks: {
  <A2, E2, R2, A, A3>(
    that: Stream<A2, E2, R2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A2>, Chunk.Chunk<A>>]
  ): <E, R>(self: Stream<A, E, R>) => Stream<A3, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3>(
    self: Stream<A, E, R>,
    that: Stream<A2, E2, R2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A2>, Chunk.Chunk<A>>]
  ): Stream<A3, E | E2, R | R2>
} = internal.zipWithChunks

/**
 * Zips each element with the next element if present.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithNext: <A, E, R>(self: Stream<A, E, R>) => Stream<[A, Option.Option<A>], E, R> = internal.zipWithNext

/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithPrevious: <A, E, R>(self: Stream<A, E, R>) => Stream<[Option.Option<A>, A], E, R> =
  internal.zipWithPrevious

/**
 * Zips each element with both the previous and next element.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithPreviousAndNext: <A, E, R>(
  self: Stream<A, E, R>
) => Stream<[Option.Option<A>, A, Option.Option<A>], E, R> = internal.zipWithPreviousAndNext

/**
 * Zips this stream together with the index of elements.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithIndex: <A, E, R>(self: Stream<A, E, R>) => Stream<[A, number], E, R> = internal.zipWithIndex

// -------------------------------------------------------------------------------------
// Do notation
// -------------------------------------------------------------------------------------

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Stream` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link bindTo}
 * @see {@link bind}
 * @see {@link bindEffect}
 * @see {@link let_ let}
 *
 * @example
 * import { Chunk, Effect, pipe, Stream } from "effect"
 *
 * const result = pipe(
 *   Stream.Do,
 *   Stream.bind("x", () => Stream.succeed(2)),
 *   Stream.bind("y", () => Stream.succeed(3)),
 *   Stream.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(Stream.runCollect(result)), Chunk.of({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const Do: Stream<{}> = internal.Do

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Stream` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link Do}
 * @see {@link bindTo}
 * @see {@link bindEffect}
 * @see {@link let_ let}
 *
 * @example
 * import { Chunk, Effect, pipe, Stream } from "effect"
 *
 * const result = pipe(
 *   Stream.Do,
 *   Stream.bind("x", () => Stream.succeed(2)),
 *   Stream.bind("y", () => Stream.succeed(3)),
 *   Stream.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(Stream.runCollect(result)), Chunk.of({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, A, B, E2, R2>(
    tag: Exclude<N, keyof A>,
    f: (_: A) => Stream<B, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
      | undefined
  ): <E, R>(self: Stream<A, E, R>) => Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E2 | E, R2 | R>
  <A, E, R, N extends string, B, E2, R2>(
    self: Stream<A, E, R>,
    tag: Exclude<N, keyof A>,
    f: (_: A) => Stream<B, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
      | undefined
  ): Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E | E2, R | R2>
} = internal.bind

/**
 * Binds an effectful value in a `do` scope
 *
 * @see {@link Do}
 * @see {@link bindTo}
 * @see {@link bind}
 * @see {@link let_ let}
 *
 * @since 2.0.0
 * @category do notation
 */
export const bindEffect: {
  <N extends string, A, B, E2, R2>(
    tag: Exclude<N, keyof A>,
    f: (_: A) => Effect.Effect<B, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
      | undefined
  ): <E, R>(self: Stream<A, E, R>) => Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E2 | E, R2 | R>
  <A, E, R, N extends string, B, E2, R2>(
    self: Stream<A, E, R>,
    tag: Exclude<N, keyof A>,
    f: (_: A) => Effect.Effect<B, E2, R2>,
    options?:
      | { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
      | undefined
  ): Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E | E2, R | R2>
} = _groupBy.bindEffect

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Stream` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link Do}
 * @see {@link bind}
 * @see {@link bindEffect}
 * @see {@link let_ let}
 *
 * @example
 * import { Chunk, Effect, pipe, Stream } from "effect"
 *
 * const result = pipe(
 *   Stream.Do,
 *   Stream.bind("x", () => Stream.succeed(2)),
 *   Stream.bind("y", () => Stream.succeed(3)),
 *   Stream.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(Stream.runCollect(result)), Chunk.of({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(name: N): <A, E, R>(self: Stream<A, E, R>) => Stream<{ [K in N]: A }, E, R>
  <A, E, R, N extends string>(self: Stream<A, E, R>, name: N): Stream<{ [K in N]: A }, E, R>
} = internal.bindTo

const let_: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): <E, R>(self: Stream<A, E, R>) => Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
  <A extends object, E, R, N extends string, B>(
    self: Stream<A, E, R>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Stream<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
} = internal.let_

export {
  /**
   * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Stream` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @see {@link Do}
   * @see {@link bindTo}
   * @see {@link bind}
   * @see {@link bindEffect}
   *
   * @example
   * import { Chunk, Effect, pipe, Stream } from "effect"
   *
   * const result = pipe(
   *   Stream.Do,
   *   Stream.bind("x", () => Stream.succeed(2)),
   *   Stream.bind("y", () => Stream.succeed(3)),
   *   Stream.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(Effect.runSync(Stream.runCollect(result)), Chunk.of({ x: 2, y: 3, sum: 5 }))
   *
   * @category do notation
   * @since 2.0.0
   */
  let_ as let
}

// -------------------------------------------------------------------------------------
// encoding
// -------------------------------------------------------------------------------------

/**
 * Decode Uint8Array chunks into a stream of strings using the specified encoding.
 *
 * @since 2.0.0
 * @category encoding
 */
export const decodeText: {
  (encoding?: string | undefined): <E, R>(self: Stream<Uint8Array, E, R>) => Stream<string, E, R>
  <E, R>(self: Stream<Uint8Array, E, R>, encoding?: string | undefined): Stream<string, E, R>
} = internal.decodeText

/**
 * Encode a stream of strings into a stream of Uint8Array chunks using the specified encoding.
 *
 * @since 2.0.0
 * @category encoding
 */
export const encodeText: <E, R>(self: Stream<string, E, R>) => Stream<Uint8Array, E, R> = internal.encodeText

/**
 * @since 3.4.0
 * @category models
 */
export interface EventListener<A> {
  addEventListener(
    event: string,
    f: (event: A) => void,
    options?: {
      readonly capture?: boolean
      readonly passive?: boolean
      readonly once?: boolean
      readonly signal?: AbortSignal
    } | boolean
  ): void
  removeEventListener(
    event: string,
    f: (event: A) => void,
    options?: {
      readonly capture?: boolean
    } | boolean
  ): void
}

/**
 * Creates a `Stream` using addEventListener.
 * @since 3.1.0
 */
export const fromEventListener: <A = unknown>(
  target: EventListener<A>,
  type: string,
  options?: boolean | {
    readonly capture?: boolean
    readonly passive?: boolean
    readonly once?: boolean
  } | undefined
) => Stream<A> = internal.fromEventListener
