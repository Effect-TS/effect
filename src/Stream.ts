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
import type * as Schedule from "./Schedule.js"
import type * as Scope from "./Scope.js"
import type * as Sink from "./Sink.js"
import type * as Emit from "./StreamEmit.js"
import type * as HaltStrategy from "./StreamHaltStrategy.js"
import type * as Take from "./Take.js"
import type * as Tracer from "./Tracer.js"
import type * as Types from "./Types.js"
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
export interface Stream<out R, out E, out A> extends Stream.Variance<R, E, A>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: StreamUnify<this>
  [Unify.ignoreSymbol]?: StreamUnifyIgnore
}

/**
 * @since 2.0.0
 * @category models
 */
export interface StreamUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Stream?: () => A[Unify.typeSymbol] extends Stream<infer R0, infer E0, infer A0> | infer _ ? Stream<R0, E0, A0> : never
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
  interface Effect<R, E, A> extends Stream<R, E, A> {}
  interface EffectUnifyIgnore {
    Stream?: true
  }
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface StreamTypeLambda extends TypeLambda {
  readonly type: Stream<this["Out2"], this["Out1"], this["Target"]>
}

/**
 * @since 2.0.0
 */
export declare namespace Stream {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out R, out E, out A> {
    readonly [StreamTypeId]: {
      _R: Types.Covariant<R>
      _E: Types.Covariant<E>
      _A: Types.Covariant<A>
    }
  }

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
export const accumulate: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>> = internal.accumulate

/**
 * Re-chunks the elements of the stream by accumulating each underlying chunk.
 *
 * @since 2.0.0
 * @category utils
 */
export const accumulateChunks: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> = internal.accumulateChunks

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const acquireRelease: <R, E, A, R2, _>(
  acquire: Effect.Effect<R, E, A>,
  release: (resource: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, _>
) => Stream<R | R2, E, A> = internal.acquireRelease

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
  <R2, E2, A, A2, B>(sink: Sink.Sink<R2, E2, A | A2, A2, B>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>
  <R, E, R2, E2, A, A2, B>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A | A2, A2, B>): Stream<R | R2, E | E2, B>
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
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, B>
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream<R | R2 | R3, E | E2, B>
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
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, Either.Either<C, B>>
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream<R | R2 | R3, E | E2, Either.Either<C, B>>
} = internal.aggregateWithinEither

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <B>(value: B): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, value: B): Stream<R, E, B>
} = internal.as

const _async: <R, E, A>(register: (emit: Emit.Emit<R, E, A, void>) => void, outputBuffer?: number) => Stream<R, E, A> =
  internal._async
export {
  /**
   * Creates a stream from an asynchronous callback that can be called multiple
   * times. The optionality of the error type `E` can be used to signal the end
   * of the stream, by setting it to `None`.
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
export const asyncEffect: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R, E, unknown>,
  outputBuffer?: number
) => Stream<R, E, A> = internal.asyncEffect

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback returns either a canceler or
 * synchronously returns a stream. The optionality of the error type `E` can
 * be used to signal the end of the stream, by setting it to `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncInterrupt: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Either.Either<Effect.Effect<R, never, unknown>, Stream<R, E, A>>,
  outputBuffer?: number
) => Stream<R, E, A> = internal.asyncInterrupt

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback can possibly return the stream
 * synchronously. The optionality of the error type `E` can be used to signal
 * the end of the stream, by setting it to `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncOption: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Option.Option<Stream<R, E, A>>,
  outputBuffer?: number
) => Stream<R, E, A> = internal.asyncOption

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback itself returns an a scoped
 * resource. The optionality of the error type `E` can be used to signal the
 * end of the stream, by setting it to `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncScoped: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R | Scope.Scope, E, unknown>,
  outputBuffer?: number
) => Stream<Exclude<R, Scope.Scope>, E, A> = internal.asyncScoped

/**
 * Returns a `Stream` that first collects `n` elements from the input `Stream`,
 * and then creates a new `Stream` using the specified function, and sends all
 * the following elements through that.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const branchAfter: {
  <A, R2, E2, A2>(
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<R2, E2, A2>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, A2>
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
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Stream<never, E, A>, N>>
  <R, E, A, N extends number>(
    self: Stream<R, E, A>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Stream<never, E, A>, N>>
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
  (maximumLag: number): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, Stream<never, E, A>>
  <R, E, A>(self: Stream<R, E, A>, maximumLag: number): Effect.Effect<Scope.Scope | R, never, Stream<never, E, A>>
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
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>
  <R, E, A, N extends number>(
    self: Stream<R, E, A>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>
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
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options: { readonly capacity: "unbounded" } | {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ): Stream<R, E, A>
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
    options: {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options: {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ): Stream<R, E, A>
} = internal.bufferChunks

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAll: {
  <E, R2, E2, A2>(f: (error: E) => Stream<R2, E2, A2>): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Stream<R, E, A>, f: (error: E) => Stream<R2, E2, A2>): Stream<R | R2, E2, A | A2>
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
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Stream<R2, E2, A2>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Stream<R2, E2, A2>
  ): Stream<R | R2, E2, A | A2>
} = internal.catchAllCause

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<Stream<R2, E2, A2>>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (error: E) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A | A2>
} = internal.catchSome

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with an error matching the given `_tag`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: Stream<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
  ): Stream<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
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
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Stream<any, any, any>) | undefined }
  >(
    cases: Cases
  ): <R, A>(
    self: Stream<R, E, A>
  ) => Stream<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer R, infer _E, infer _A> ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer E, infer _A> ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer _E, infer A> ? A
        : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Stream<any, any, any>) | undefined }
  >(
    self: Stream<R, E, A>,
    cases: Cases
  ): Stream<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer R, infer _E, infer _A> ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer E, infer _A> ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer _E, infer A> ? A
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
  <E, R2, E2, A2>(
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<R2, E2, A2>>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A | A2>
} = internal.catchSomeCause

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using natural equality to determine whether two
 * elements are equal.
 *
 * @since 2.0.0
 * @category utils
 */
export const changes: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> = internal.changes

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @since 2.0.0
 * @category utils
 */
export const changesWith: {
  <A>(f: (x: A, y: A) => boolean): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, f: (x: A, y: A) => boolean): Stream<R, E, A>
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
  <A, R2, E2>(
    f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Stream<R, E, A>, f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>): Stream<R | R2, E | E2, A>
} = internal.changesWithEffect

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of
 * elements.
 *
 * @since 2.0.0
 * @category utils
 */
export const chunks: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>> = internal.chunks

/**
 * Performs the specified stream transformation with the chunk structure of
 * the stream exposed.
 *
 * @since 2.0.0
 * @category utils
 */
export const chunksWith: <R, E, A, R2, E2, A2>(
  f: (stream: Stream<R, E, Chunk.Chunk<A>>) => Stream<R2, E2, Chunk.Chunk<A2>>
) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, A2> = internal.chunksWith

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
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ): Stream<R | R2 | R3 | R4 | R5, E2 | E, A3>
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
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ): Stream<R | R2 | R3 | R4 | R5, E2 | E, A3>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A | A2>
} = internal.concat

/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const concatAll: <R, E, A>(streams: Chunk.Chunk<Stream<R, E, A>>) => Stream<R, E, A> = internal.concatAll

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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
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
  <R2, E2, B, A, C>(
    that: Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, C>
  <R, E, R2, E2, B, A, C>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Stream<R | R2, E | E2, C>
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
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
} = internal.debounce

/**
 * The stream that dies with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Stream<never, never, never> = internal.die

/**
 * The stream that dies with the specified lazily evaluated defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Stream<never, never, never> = internal.dieSync

/**
 * The stream that dies with an exception described by `message`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Stream<never, never, never> = internal.dieMessage

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
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): <R, E>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>>
  <R, E, N extends number, A>(
    self: Stream<R, E, A>,
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>>
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
  <E, A, _>(
    options: {
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): <R>(
    self: Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
  <R, E, A, _>(
    self: Stream<R, E, A>,
    options: {
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
} = internal.distributedWithDynamic

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 *
 * @since 2.0.0
 * @category utils
 */
export const drain: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, never> = internal.drain

/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @since 2.0.0
 * @category utils
 */
export const drainFork: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
} = internal.drainFork

/**
 * Drops the specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const drop: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
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
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
} = internal.dropRight

/**
 * Drops all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropUntil: {
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.dropUntil

/**
 * Drops all elements of the stream until the specified effectful predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropUntilEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
} = internal.dropUntilEffect

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dropWhile: {
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.dropWhile

/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`
 *
 * @since 2.0.0
 * @category utils
 */
export const dropWhileEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
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
export const either: <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, Either.Either<E, A>> = internal.either

/**
 * The empty stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: Stream<never, never, never> = internal.empty

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @since 2.0.0
 * @category utils
 */
export const ensuring: {
  <R2, _>(finalizer: Effect.Effect<R2, never, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, _>(self: Stream<R, E, A>, finalizer: Effect.Effect<R2, never, _>): Stream<R | R2, E, A>
} = internal.ensuring

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @since 2.0.0
 * @category utils
 */
export const ensuringWith: {
  <E, R2>(
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2>(
    self: Stream<R, E, A>,
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ): Stream<R | R2, E, A>
} = internal.ensuringWith

/**
 * Accesses the whole context of the stream.
 *
 * @since 2.0.0
 * @category context
 */
export const context: <R>() => Stream<R, never, Context.Context<R>> = internal.context

/**
 * Accesses the context of the stream.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWith: <R, A>(f: (env: Context.Context<R>) => A) => Stream<R, never, A> = internal.contextWith

/**
 * Accesses the context of the stream in the context of an effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithEffect: <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Effect.Effect<R, E, A>
) => Stream<R0 | R, E, A> = internal.contextWithEffect

/**
 * Accesses the context of the stream in the context of a stream.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithStream: <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Stream<R, E, A>
) => Stream<R0 | R, E, A> = internal.contextWithStream

/**
 * Creates a stream that executes the specified effect but emits no elements.
 *
 * @since 2.0.0
 * @category constructors
 */
export const execute: <R, E, _>(effect: Effect.Effect<R, E, _>) => Stream<R, E, never> = internal.execute

/**
 * Terminates with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Stream<never, E, never> = internal.fail

/**
 * Terminates with the specified lazily evaluated error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Stream<never, E, never> = internal.failSync

/**
 * The stream that always fails with the specified `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Stream<never, E, never> = internal.failCause

/**
 * The stream that always fails with the specified lazily evaluated `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Stream<never, E, never> = internal.failCauseSync

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.filter

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterEffect: {
  <A, X extends A, R2, E2>(
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
} = internal.filterEffect

/**
 * Performs a filter and map in a single step.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMap: {
  <A, B>(pf: (a: A) => Option.Option<B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, pf: (a: A) => Option.Option<B>): Stream<R, E, B>
} = internal.filterMap

/**
 * Performs an effectful filter and map in a single step.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
} = internal.filterMapEffect

/**
 * Transforms all elements of the stream for as long as the specified partial
 * function is defined.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapWhile: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, pf: (a: A) => Option.Option<A2>): Stream<R, E, A2>
} = internal.filterMapWhile

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @since 2.0.0
 * @category utils
 */
export const filterMapWhileEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
} = internal.filterMapWhileEffect

/**
 * Creates a one-element stream that never fails and executes the finalizer
 * when it ends.
 *
 * @since 2.0.0
 * @category constructors
 */
export const finalizer: <R, _>(finalizer: Effect.Effect<R, never, _>) => Stream<R, never, void> = internal.finalizer

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 *
 * @since 2.0.0
 * @category elements
 */
export const find: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.find

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 *
 * @since 2.0.0
 * @category elements
 */
export const findEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
} = internal.findEffect

/**
 * Returns a stream made of the concatenation in strict order of all the
 * streams produced by passing each element of this stream to `f0`
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, R2, E2, A2>(
    f: (a: A) => Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ): Stream<R | R2, E | E2, A2>
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
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): <R, E, R2, E2, A>(self: Stream<R, E, Stream<R2, E2, A>>) => Stream<R | R2, E | E2, A>
  <R, E, R2, E2, A>(
    self: Stream<R, E, Stream<R2, E2, A>>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): Stream<R | R2, E | E2, A>
} = internal.flatten

/**
 * Submerges the chunks carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenChunks: <R, E, A>(self: Stream<R, E, Chunk.Chunk<A>>) => Stream<R, E, A> = internal.flattenChunks

/**
 * Flattens `Effect` values into the stream's structure, preserving all
 * information about the effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenEffect: {
  (
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ): <R, E, R2, E2, A>(self: Stream<R, E, Effect.Effect<R2, E2, A>>) => Stream<R | R2, E | E2, A>
  <R, E, R2, E2, A>(
    self: Stream<R, E, Effect.Effect<R2, E2, A>>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ): Stream<R | R2, E | E2, A>
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
export const flattenExitOption: <R, E, E2, A>(
  self: Stream<R, E, Exit.Exit<Option.Option<E2>, A>>
) => Stream<R, E | E2, A> = internal.flattenExitOption

/**
 * Submerges the iterables carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenIterables: <R, E, A>(self: Stream<R, E, Iterable<A>>) => Stream<R, E, A> = internal.flattenIterables

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream
 * by failing with `None`.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flattenTake: <R, E, E2, A>(
  self: Stream<R, E, Take.Take<E2, A>>
) => Stream<R, E | E2, A> = internal.flattenTake

/**
 * Repeats this stream forever.
 *
 * @since 2.0.0
 * @category utils
 */
export const forever: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> = internal.forever

/**
 * Creates a stream from an `AsyncIterable`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromAsyncIterable: <E, A>(
  iterable: AsyncIterable<A>,
  onError: (e: unknown) => E
) => Stream<never, E, A> = internal.fromAsyncIterable

/**
 * Creates a stream from a `Channel`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChannel: <R, E, A>(
  channel: Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
) => Stream<R, E, A> = internal.fromChannel

/**
 * Creates a channel from a `Stream`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const toChannel: <R, E, A>(
  stream: Stream<R, E, A>
) => Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> = internal.toChannel

/**
 * Creates a stream from a `Chunk` of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChunk: <A>(chunk: Chunk.Chunk<A>) => Stream<never, never, A> = internal.fromChunk

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
    options: {
      readonly scoped: true
      readonly shutdown?: boolean | undefined
    }
  ): Effect.Effect<Scope.Scope, never, Stream<never, never, A>>
  <A>(
    pubsub: PubSub.PubSub<Chunk.Chunk<A>>,
    options?: {
      readonly scoped?: false | undefined
      readonly shutdown?: boolean | undefined
    }
  ): Stream<never, never, A>
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
) => Stream<never, never, A> = internal.fromChunkQueue

/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChunks: <A>(...chunks: Array<Chunk.Chunk<A>>) => Stream<never, never, A> = internal.fromChunks

/**
 * Either emits the success value of this effect or terminates the stream
 * with the failure value of this effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<R, E, A> = internal.fromEffect

/**
 * Creates a stream from an effect producing a value of type `A` or an empty
 * `Stream`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffectOption: <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>) => Stream<R, E, A> =
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
  ): Effect.Effect<Scope.Scope, never, Stream<never, never, A>>
  <A>(
    pubsub: PubSub.PubSub<A>,
    options?: {
      readonly scoped?: false | undefined
      readonly maxChunkSize?: number | undefined
      readonly shutdown?: boolean | undefined
    }
  ): Stream<never, never, A>
} = internal.fromPubSub

/**
 * Creates a new `Stream` from an iterable collection of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <A>(iterable: Iterable<A>) => Stream<never, never, A> = internal.fromIterable

/**
 * Creates a stream from an effect producing a value of type `Iterable<A>`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterableEffect: <R, E, A>(effect: Effect.Effect<R, E, Iterable<A>>) => Stream<R, E, A> =
  internal.fromIterableEffect

/**
 * Creates a stream from an iterator
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIteratorSucceed: <A>(iterator: IterableIterator<A>, maxChunkSize?: number) => Stream<never, never, A> =
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
  effect: Effect.Effect<Scope.Scope | R, never, Effect.Effect<R2, Option.Option<E>, Chunk.Chunk<A>>>
) => Stream<Exclude<R, Scope.Scope> | R2, E, A> = internal.fromPull

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
) => Stream<never, never, A> = internal.fromQueue

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
) => Stream<never, E, A> = internal.fromReadableStream

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
) => Stream<never, E, Uint8Array> = internal.fromReadableStreamByob

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromSchedule: <R, A>(schedule: Schedule.Schedule<R, unknown, A>) => Stream<R, never, A> =
  internal.fromSchedule

/**
 * Creates a pipeline that groups on adjacent keys, calculated by the
 * specified function.
 *
 * @since 2.0.0
 * @category grouping
 */
export const groupAdjacentBy: {
  <A, K>(f: (a: A) => K): <R, E>(self: Stream<R, E, A>) => Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>
  <R, E, A, K>(self: Stream<R, E, A>, f: (a: A) => K): Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>
} = internal.groupAdjacentBy

/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @since 2.0.0
 * @category grouping
 */
export const groupBy: {
  <A, R2, E2, K, V>(
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => GroupBy.GroupBy<R2 | R, E2 | E, K, V>
  <R, E, A, R2, E2, K, V>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): GroupBy.GroupBy<R | R2, E | E2, K, V>
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
  ): <R, E>(self: Stream<R, E, A>) => GroupBy.GroupBy<R, E, K, A>
  <R, E, A, K>(
    self: Stream<R, E, A>,
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): GroupBy.GroupBy<R, E, K, A>
} = _groupBy.groupByKey

/**
 * Partitions the stream with specified `chunkSize`.
 *
 * @since 2.0.0
 * @category utils
 */
export const grouped: {
  (chunkSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number): Stream<R, E, Chunk.Chunk<A>>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number, duration: Duration.DurationInput): Stream<R, E, Chunk.Chunk<A>>
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
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
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
  <R2, E2, _>(effect: Effect.Effect<R2, E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, _>): Stream<R | R2, E | E2, A>
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
  <E2, _>(deferred: Deferred.Deferred<E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2, _>(self: Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream<R, E | E2, A>
} = internal.haltWhenDeferred

/**
 * The identity pipeline, which does not modify streams in any way.
 *
 * @since 2.0.0
 * @category utils
 */
export const identity: <R, E, A>() => Stream<R, E, A> = internal.identityStream

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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A | A2>
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
  <R2, E2, A2, R3, E3>(
    that: Stream<R2, E2, A2>,
    decider: Stream<R3, E3, boolean>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E3 | E, A2 | A>
  <R, E, A, R2, E2, A2, R3, E3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    decider: Stream<R3, E3, boolean>
  ): Stream<R | R2 | R3, E | E2 | E3, A | A2>
} = internal.interleaveWith

/**
 * Intersperse stream with provided `element`.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersperse: {
  <A2>(element: A2): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, element: A2): Stream<R, E, A | A2>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A3 | A4 | A>
  <R, E, A, A2, A3, A4>(
    self: Stream<R, E, A>,
    options: { readonly start: A2; readonly middle: A3; readonly end: A4 }
  ): Stream<R, E, A | A2 | A3 | A4>
} = internal.intersperseAffixes

/**
 * Specialized version of `Stream.interruptWhen` which interrupts the
 * evaluation of this stream after the given `Duration`.
 *
 * @since 2.0.0
 * @category utils
 */
export const interruptAfter: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
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
  <R2, E2, _>(effect: Effect.Effect<R2, E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, _>): Stream<R | R2, E | E2, A>
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
  <E2, _>(deferred: Deferred.Deferred<E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2, _>(self: Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream<R, E | E2, A>
} = internal.interruptWhenDeferred

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)),
 * f(f(f(a))), ...
 *
 * @since 2.0.0
 * @category constructors
 */
export const iterate: <A>(value: A, next: (value: A) => A) => Stream<never, never, A> = internal.iterate

/**
 * Creates a stream from an sequence of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <As extends Array<any>>(...as: As) => Stream<never, never, As[number]> = internal.make

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B>
} = internal.map

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccum: {
  <S, A, A2>(s: S, f: (s: S, a: A) => readonly [S, A2]): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, S, A, A2>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => readonly [S, A2]): Stream<R, E, A2>
} = internal.mapAccum

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccumEffect: {
  <S, A, R2, E2, A2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, S, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ): Stream<R | R2, E | E2, A2>
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
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ): <R>(self: Stream<R, E, A>) => Stream<R, E2, A2>
  <R, E, E2, A, A2>(
    self: Stream<R, E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ): Stream<R, E2, A2>
} = internal.mapBoth

/**
 * Transforms the chunks emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapChunks: {
  <A, B>(f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): Stream<R, E, B>
} = internal.mapChunks

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapChunksEffect: {
  <A, R2, E2, B>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>
  <R, E, A, R2, E2, B>(
    self: Stream<R, E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ): Stream<R | R2, E | E2, B>
} = internal.mapChunksEffect

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcat: {
  <A, A2>(f: (a: A) => Iterable<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, f: (a: A) => Iterable<A2>): Stream<R, E, A2>
} = internal.mapConcat

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatChunk: {
  <A, A2>(f: (a: A) => Chunk.Chunk<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, f: (a: A) => Chunk.Chunk<A2>): Stream<R, E, A2>
} = internal.mapConcatChunk

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into the
 * output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatChunkEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ): Stream<R | R2, E | E2, A2>
} = internal.mapConcatChunkEffect

/**
 * Effectfully maps each element to an iterable, and flattens the iterables
 * into the output of this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapConcatEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ): Stream<R | R2, E | E2, A2>
} = internal.mapConcatEffect

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <A, R2, E2, A2, K>(
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options: {
      readonly key: (a: A) => K
      readonly bufferSize?: number | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ): Stream<R | R2, E | E2, A2>
  <R, E, A, R2, E2, A2, K>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options: {
      readonly key: (a: A) => K
      readonly bufferSize?: number | undefined
    }
  ): Stream<R | R2, E | E2, A2>
} = _groupBy.mapEffectOptions

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, f: (error: E) => E2): Stream<R, E2, A>
} = internal.mapError

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Stream<R, E2, A>
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
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>,
    options?: {
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    options?: {
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream<R | R2, E | E2, A | A2>
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
  ): <R, E, A>(streams: Iterable<Stream<R, E, A>>) => Stream<R, E, A>
  <R, E, A>(
    streams: Iterable<Stream<R, E, A>>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
    }
  ): Stream<R, E, A>
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
  <R2, E2, A2, A, A3, A4>(
    other: Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3 | A4>
  <R, E, R2, E2, A2, A, A3, A4>(
    self: Stream<R, E, A>,
    other: Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream<R | R2, E | E2, A3 | A4>
} = internal.mergeWith

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeEither: {
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, Either.Either<A, A2>>
} = internal.mergeEither

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the right stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeLeft: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
} = internal.mergeLeft

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the left stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mergeRight: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
} = internal.mergeRight

/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const mkString: <R, E>(self: Stream<R, E, string>) => Effect.Effect<R, E, string> = internal.mkString

/**
 * The stream that never produces any value or fails with any error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: Stream<never, never, never> = internal.never

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
  <E, R2, _>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, A, E, R2, _>(
    self: Stream<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ): Stream<R | R2, E, A>
} = internal.onError

/**
 * Runs the specified effect if this stream ends.
 *
 * @since 2.0.0
 * @category utils
 */
export const onDone: {
  <R2, _>(cleanup: () => Effect.Effect<R2, never, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, _>(self: Stream<R, E, A>, cleanup: () => Effect.Effect<R2, never, _>): Stream<R | R2, E, A>
} = internal.onDone

/**
 * Translates any failure into a stream termination, making the stream
 * infallible and all failures unchecked.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDie: <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, A> = internal.orDie

/**
 * Keeps none of the errors, and terminates the stream with them, using the
 * specified function to convert the `E` into a defect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDieWith: {
  <E>(f: (e: E) => unknown): <R, A>(self: Stream<R, E, A>) => Stream<R, never, A>
  <R, A, E>(self: Stream<R, E, A>, f: (e: E) => unknown): Stream<R, never, A>
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
  <R2, E2, A2>(that: LazyArg<Stream<R2, E2, A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: LazyArg<Stream<R2, E2, A2>>): Stream<R | R2, E2, A | A2>
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
  <R2, E2, A2>(
    that: LazyArg<Stream<R2, E2, A2>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    that: LazyArg<Stream<R2, E2, A2>>
  ): Stream<R | R2, E2, Either.Either<A, A2>>
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
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, E, A, E2>(self: Stream<R, E, A>, error: LazyArg<E2>): Stream<R, E2, A>
} = internal.orElseFail

/**
 * Produces the specified element if this stream is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmpty: {
  <A2>(element: LazyArg<A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, element: LazyArg<A2>): Stream<R, E, A | A2>
} = internal.orElseIfEmpty

/**
 * Produces the specified chunk if this stream is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmptyChunk: {
  <A2>(chunk: LazyArg<Chunk.Chunk<A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, chunk: LazyArg<Chunk.Chunk<A2>>): Stream<R, E, A | A2>
} = internal.orElseIfEmptyChunk

/**
 * Switches to the provided stream in case this one is empty.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseIfEmptyStream: {
  <R2, E2, A2>(stream: LazyArg<Stream<R2, E2, A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, stream: LazyArg<Stream<R2, E2, A2>>): Stream<R | R2, E | E2, A | A2>
} = internal.orElseIfEmptyStream

/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, value: LazyArg<A2>): Stream<R, never, A | A2>
} = internal.orElseSucceed

/**
 * Like `Stream.unfold`, but allows the emission of values to end one step further
 * than the unfolding of the state. This is useful for embedding paginated
 * APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginate: <S, A>(s: S, f: (s: S) => readonly [A, Option.Option<S>]) => Stream<never, never, A> =
  internal.paginate

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
) => Stream<never, never, A> = internal.paginateChunk

/**
 * Like `Stream.unfoldChunkEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginateChunkEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [Chunk.Chunk<A>, Option.Option<S>]>
) => Stream<R, E, A> = internal.paginateChunkEffect

/**
 * Like `Stream.unfoldEffect` but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const paginateEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [A, Option.Option<S>]>
) => Stream<R, E, A> = internal.paginateEffect

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
    refinement: Refinement<A, B>,
    options?: {
      bufferSize?: number | undefined
    }
  ): <R, E>(
    self: Stream<R, E, C>
  ) => Effect.Effect<Scope.Scope | R, E, [excluded: Stream<never, E, Exclude<C, B>>, satisfying: Stream<never, E, B>]>
  <A>(
    predicate: Predicate<A>,
    options?: {
      bufferSize?: number | undefined
    }
  ): <R, E, B extends A>(
    self: Stream<R, E, B>
  ) => Effect.Effect<Scope.Scope | R, E, [excluded: Stream<never, E, B>, satisfying: Stream<never, E, B>]>
  <R, E, A, B extends A>(
    self: Stream<R, E, A>,
    refinement: Refinement<A, B>,
    options?: {
      bufferSize?: number | undefined
    }
  ): Effect.Effect<Scope.Scope | R, E, [excluded: Stream<never, E, Exclude<A, B>>, satisfying: Stream<never, E, B>]>
  <R, E, A>(
    self: Stream<R, E, A>,
    predicate: Predicate<A>,
    options?: {
      bufferSize?: number | undefined
    }
  ): Effect.Effect<Scope.Scope | R, E, [excluded: Stream<never, E, A>, satisfying: Stream<never, E, A>]>
} = internal.partition

/**
 * Split a stream by an effectful predicate. The faster stream may advance by
 * up to buffer elements further than the slower one.
 *
 * @since 2.0.0
 * @category utils
 */
export const partitionEither: {
  <A, R2, E2, A2, A3>(
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): <R, E>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [left: Stream<never, E2 | E, A2>, right: Stream<never, E2 | E, A3>]>
  <R, E, A, R2, E2, A2, A3>(
    self: Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, [left: Stream<never, E | E2, A2>, right: Stream<never, E | E2, A3>]>
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
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, A, Z>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [Z, Stream<never, E, A>]>
  <R, E, R2, E2, A, Z>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, A, Z>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, [Z, Stream<never, E, A>]>
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
  <R2, E2, A, L, Z>(sink: Sink.Sink<R2, E2, A, L, Z>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, L>
  <R, E, R2, E2, A, L, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, L, Z>): Stream<R | R2, E | E2, L>
} = internal.pipeThrough

/**
 * Pipes all the values from this stream through the provided channel.
 *
 * @since 2.0.0
 * @category utils
 */
export const pipeThroughChannel: {
  <R2, E, E2, A, A2>(
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2>
  <R, R2, E, E2, A, A2>(
    self: Stream<R, E, A>,
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream<R | R2, E2, A2>
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
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2>
  <R, R2, E, E2, A, A2>(
    self: Stream<R, E, A>,
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream<R | R2, E | E2, A2>
} = internal.pipeThroughChannelOrFail

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @since 2.0.0
 * @category utils
 */
export const prepend: {
  <B>(values: Chunk.Chunk<B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, B | A>
  <R, E, A, B>(self: Stream<R, E, A>, values: Chunk.Chunk<B>): Stream<R, E, A | B>
} = internal.prepend

/**
 * Provides the stream with its required context, which eliminates its
 * dependency on `R`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(context: Context.Context<R>): <E, A>(self: Stream<R, E, A>) => Stream<never, E, A>
  <E, A, R>(self: Stream<R, E, A>, context: Context.Context<R>): Stream<never, E, A>
} = internal.provideContext

/**
 * Provides a `Layer` to the stream, which translates it to another level.
 *
 * @since 2.0.0
 * @category context
 */
export const provideLayer: {
  <RIn, E2, ROut>(layer: Layer.Layer<RIn, E2, ROut>): <E, A>(self: Stream<ROut, E, A>) => Stream<RIn, E2 | E, A>
  <E, A, RIn, E2, ROut>(self: Stream<ROut, E, A>, layer: Layer.Layer<RIn, E2, ROut>): Stream<RIn, E | E2, A>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ): Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>
} = internal.provideService

/**
 * Provides the stream with the single service it requires. If the stream
 * requires more than one service use `Stream.provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream<R, E, A>,
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ): Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E | E2, A>
} = internal.provideServiceEffect

/**
 * Provides the stream with the single service it requires. If the stream
 * requires more than one service use `Stream.provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceStream: {
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    stream: Stream<R2, E2, Context.Tag.Service<T>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream<R, E, A>,
    tag: T,
    stream: Stream<R2, E2, Context.Tag.Service<T>>
  ): Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E | E2, A>
} = internal.provideServiceStream

/**
 * Transforms the context being provided to the stream with the specified
 * function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (env: Context.Context<R0>) => Context.Context<R>): <E, A>(self: Stream<R, E, A>) => Stream<R0, E, A>
  <E, A, R0, R>(self: Stream<R, E, A>, f: (env: Context.Context<R0>) => Context.Context<R>): Stream<R0, E, A>
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
    layer: Layer.Layer<RIn, E2, ROut>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<RIn | Exclude<R, ROut>, E2 | E, A>
  <R, E, A, RIn, E2, ROut>(
    self: Stream<R, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ): Stream<RIn | Exclude<R, ROut>, E | E2, A>
} = internal.provideSomeLayer

/**
 * Constructs a stream from a range of integers, including both endpoints.
 *
 * @since 2.0.0
 * @category constructors
 */
export const range: (min: number, max: number, chunkSize?: number) => Stream<never, never, number> = internal.range

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each. The
 * last chunk might contain less than `n` elements.
 *
 * @since 2.0.0
 * @category utils
 */
export const rechunk: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
} = internal.rechunk

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @since 2.0.0
 * @category error handling
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, pf: (error: E) => Option.Option<E2>): Stream<R, E2, A>
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
  ): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): Stream<R, E2, A>
} = internal.refineOrDieWith

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeat: {
  <R2, B>(schedule: Schedule.Schedule<R2, unknown, B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, B>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, unknown, B>): Stream<R | R2, E, A>
} = internal.repeat

/**
 * Creates a stream from an effect producing a value of type `A` which repeats
 * forever.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<R, E, A> = internal.repeatEffect

/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectChunk: <R, E, A>(effect: Effect.Effect<R, E, Chunk.Chunk<A>>) => Stream<R, E, A> =
  internal.repeatEffectChunk

/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectChunkOption: <R, E, A>(
  effect: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>
) => Stream<R, E, A> = internal.repeatEffectChunkOption

/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectOption: <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>) => Stream<R, E, A> =
  internal.repeatEffectOption

/**
 * Creates a stream from an effect producing a value of type `A`, which is
 * repeated using the specified schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatEffectWithSchedule: <R, E, A, A0 extends A, R2, _>(
  effect: Effect.Effect<R, E, A>,
  schedule: Schedule.Schedule<R2, A0, _>
) => Stream<R | R2, E, A> = internal.repeatEffectWithSchedule

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeatEither: {
  <R2, B>(
    schedule: Schedule.Schedule<R2, unknown, B>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, Either.Either<B, A>>
  <R, E, A, R2, B>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ): Stream<R | R2, E, Either.Either<B, A>>
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
  <R2, B>(schedule: Schedule.Schedule<R2, unknown, B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, B>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, unknown, B>): Stream<R | R2, E, A>
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
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, B, A, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream<R | R2, E, C>
} = internal.repeatElementsWith

/**
 * Repeats the provided value infinitely.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatValue: <A>(value: A) => Stream<never, never, A> = internal.repeatValue

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
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, B, A, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream<R | R2, E, C>
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
  <R2, E, E0 extends E, _>(
    schedule: Schedule.Schedule<R2, E0, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, A, R2, E, E0 extends E, _>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, E0, _>): Stream<R | R2, E, A>
} = internal.retry

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @since 2.0.0
 * @category destructors
 */
export const run: {
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, unknown, Z>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, Z>
  <R, E, R2, E2, A, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, unknown, Z>): Effect.Effect<R | R2, E | E2, Z>
} = internal.run

/**
 * Runs the stream and collects all of its elements to a chunk.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runCollect: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Chunk.Chunk<A>> = internal.runCollect

/**
 * Runs the stream and emits the number of elements processed
 *
 * @since 2.0.0
 * @category destructors
 */
export const runCount: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, number> = internal.runCount

/**
 * Runs the stream only for its effects. The emitted elements are discarded.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runDrain: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, void> = internal.runDrain

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFold: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<R, E, S>
} = internal.runFold

/**
 * Executes an effectful fold over the stream of values.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<R | R2, E | E2, S>
} = internal.runFoldEffect

/**
 * Executes a pure fold over the stream of values. Returns a scoped value that
 * represents the scope of the stream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldScoped: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<Scope.Scope | R, E, S>
} = internal.runFoldScoped

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldScopedEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, S>
} = internal.runFoldScopedEffect

/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled. Example:
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhile: {
  <S, A>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, cont: Predicate<S>, f: (s: S, a: A) => S): Effect.Effect<R, E, S>
} = internal.runFoldWhile

/**
 * Executes an effectful fold over the stream of values. Stops the fold early
 * when the condition is not fulfilled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runFoldWhileEffect: {
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<R | R2, E | E2, S>
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
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R | Scope.Scope, E, S>
  <R, E, S, A>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ): Effect.Effect<Scope.Scope | R, E, S>
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
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, S>
} = internal.runFoldWhileScopedEffect

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEach: {
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<R | R2, E | E2, void>
} = internal.runForEach

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachChunk: {
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<R | R2, E | E2, void>
} = internal.runForEachChunk

/**
 * Like `Stream.runForEachChunk`, but returns a scoped effect so the
 * finalization order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachChunkScoped: {
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
} = internal.runForEachChunkScoped

/**
 * Like `Stream.forEach`, but returns a scoped effect so the finalization
 * order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachScoped: {
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
} = internal.runForEachScoped

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachWhile: {
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Effect.Effect<R | R2, E | E2, void>
} = internal.runForEachWhile

/**
 * Like `Stream.runForEachWhile`, but returns a scoped effect so the
 * finalization order can be controlled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runForEachWhileScoped: {
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
} = internal.runForEachWhileScoped

/**
 * Runs the stream to completion and yields the first value emitted by it,
 * discarding the rest of the elements.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runHead: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Option.Option<A>> = internal.runHead

/**
 * Publishes elements of this stream to a `PubSub`. Stream failure and ending will
 * also be signalled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoPubSub: {
  <E, A>(pubsub: PubSub.PubSub<Take.Take<E, A>>): <R>(self: Stream<R, E, A>) => Effect.Effect<R, never, void>
  <R, E, A>(self: Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>): Effect.Effect<R, never, void>
} = internal.runIntoPubSub

/**
 * Like `Stream.runIntoPubSub`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoPubSubScoped: {
  <E, A>(
    pubsub: PubSub.PubSub<Take.Take<E, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>
  <R, E, A>(self: Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>): Effect.Effect<Scope.Scope | R, never, void>
} = internal.runIntoPubSubScoped

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueue: {
  <E, A>(queue: Queue.Enqueue<Take.Take<E, A>>): <R>(self: Stream<R, E, A>) => Effect.Effect<R, never, void>
  <R, E, A>(self: Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>): Effect.Effect<R, never, void>
} = internal.runIntoQueue

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped [[ZIO]]
 * to allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueueElementsScoped: {
  <E, A>(
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>
  <R, E, A>(
    self: Stream<R, E, A>,
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ): Effect.Effect<Scope.Scope | R, never, void>
} = internal.runIntoQueueElementsScoped

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect
 * to allow for scope composition.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runIntoQueueScoped: {
  <E, A>(
    queue: Queue.Enqueue<Take.Take<E, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<R | Scope.Scope, never, void>
  <R, E, A>(self: Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>): Effect.Effect<Scope.Scope | R, never, void>
} = internal.runIntoQueueScoped

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runLast: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Option.Option<A>> = internal.runLast

/**
 * @since 2.0.0
 * @category destructors
 */
export const runScoped: {
  <R2, E2, A, A2>(
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, A2>
  <R, E, R2, E2, A, A2>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, A2>
} = internal.runScoped

/**
 * Runs the stream to a sink which sums elements, provided they are Numeric.
 *
 * @since 2.0.0
 * @category destructors
 */
export const runSum: <R, E>(self: Stream<R, E, number>) => Effect.Effect<R, E, number> = internal.runSum

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @since 2.0.0
 * @category utils
 */
export const scan: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Stream<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Stream<R, E, S>
} = internal.scan

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results of type `S` given an initial S.
 *
 * @since 2.0.0
 * @category utils
 */
export const scanEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Stream<R | R2, E | E2, S>
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
  <A2, A>(f: (a2: A2 | A, a: A) => A2): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A2, A>(self: Stream<R, E, A>, f: (a2: A2 | A, a: A) => A2): Stream<R, E, A2 | A>
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
export const scanReduceEffect: <A2, A, R2, E2>(
  f: (a2: A2 | A, a: A) => Effect.Effect<R2, E2, A2 | A>
) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A> = internal.scanReduceEffect

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @since 2.0.0
 * @category utils
 */
export const schedule: {
  <R2, A, A0 extends A, _>(
    schedule: Schedule.Schedule<R2, A0, _>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, R2, A, A0 extends A, _>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, A0, _>): Stream<R | R2, E, A>
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
  <R2, A, A0 extends A, B, C>(
    schedule: Schedule.Schedule<R2, A0, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, A, A0 extends A, B, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream<R | R2, E, C>
} = internal.scheduleWith

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @since 2.0.0
 * @category constructors
 */
export const scoped: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<Exclude<R, Scope.Scope>, E, A> =
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
  (chunkSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number): Stream<R, E, Chunk.Chunk<A>>
} = internal.sliding

/**
 * Like `sliding`, but with a configurable `stepSize` parameter.
 *
 * @since 2.0.0
 * @category utils
 */
export const slidingSize: {
  (chunkSize: number, stepSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number, stepSize: number): Stream<R, E, Chunk.Chunk<A>>
} = internal.slidingSize

/**
 * Converts an option on values into an option on errors.
 *
 * @since 2.0.0
 * @category utils
 */
export const some: <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, Option.Option<E>, A> = internal.some

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @since 2.0.0
 * @category utils
 */
export const someOrElse: {
  <A2>(fallback: LazyArg<A2>): <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, Option.Option<A>>, fallback: LazyArg<A2>): Stream<R, E, A | A2>
} = internal.someOrElse

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @since 2.0.0
 * @category utils
 */
export const someOrFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(self: Stream<R, E, Option.Option<A>>, error: LazyArg<E2>): Stream<R, E | E2, A>
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
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, Chunk.Chunk<B>>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, Chunk.Chunk<A>>
} = internal.split

/**
 * Splits elements on a delimiter and transforms the splits into desired output.
 *
 * @since 2.0.0
 * @category utils
 */
export const splitOnChunk: {
  <A>(delimiter: Chunk.Chunk<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, delimiter: Chunk.Chunk<A>): Stream<R, E, Chunk.Chunk<A>>
} = internal.splitOnChunk

/**
 * Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
 * newlines (`\n`).
 *
 * @since 2.0.0
 * @category combinators
 */
export const splitLines: <R, E>(self: Stream<R, E, string>) => Stream<R, E, string> = internal.splitLines

/**
 * Creates a single-valued pure stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Stream<never, never, A> = internal.succeed

/**
 * Creates a single-valued pure stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Stream<never, never, A> = internal.sync

/**
 * Returns a lazily constructed stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(stream: LazyArg<Stream<R, E, A>>) => Stream<R, E, A> = internal.suspend

/**
 * Takes the specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const take: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
} = internal.take

/**
 * Takes the last specified number of elements from this stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeRight: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
} = internal.takeRight

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeUntil: {
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.takeUntil

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeUntilEffect: {
  <A, R2, E2>(
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
} = internal.takeUntilEffect

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeWhile: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, B>) => Stream<R, E, B>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
} = internal.takeWhile

/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X extends A, R2, E2, _>(
    f: (a: X) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
} = internal.tap

/**
 * Returns a stream that effectfully "peeks" at the failure or success of
 * the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ): <R>(self: Stream<R, E, A>) => Stream<R | R2 | R3, E | E2 | E3, A>
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Stream<R, E, A>,
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ): Stream<R | R2 | R3, E | E2 | E3, A>
} = internal.tapBoth

/**
 * Returns a stream that effectfully "peeks" at the failure of the stream.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, X extends E, R2, E2, _>(
    f: (error: X) => Effect.Effect<R2, E2, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (error: X) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
} = internal.tapError

/**
 * Returns a stream that effectfully "peeks" at the cause of failure of the
 * stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const tapErrorCause: {
  <E, X extends E, R2, E2, _>(
    f: (cause: Cause.Cause<X>) => Effect.Effect<R2, E2, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (cause: Cause.Cause<X>) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
} = internal.tapErrorCause

/**
 * Sends all elements emitted by this stream to the specified sink in addition
 * to emitting them.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapSink: {
  <R2, E2, A>(sink: Sink.Sink<R2, E2, A, unknown, unknown>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, R2, E2, A>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, unknown, unknown>): Stream<R | R2, E | E2, A>
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
  ): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<R, E, A>
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
  <A, R2, E2>(
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<R | R2, E | E2, A>
} = internal.throttleEffect

/**
 * A stream that emits Unit values spaced by the specified duration.
 *
 * @since 2.0.0
 * @category constructors
 */
export const tick: (interval: Duration.DurationInput) => Stream<never, never, void> = internal.tick

/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeout: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
} = internal.timeout

/**
 * Fails the stream with given error if it does not produce a value after d
 * duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeoutFail: {
  <E2>(error: LazyArg<E2>, duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(self: Stream<R, E, A>, error: LazyArg<E2>, duration: Duration.DurationInput): Stream<R, E | E2, A>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(
    self: Stream<R, E, A>,
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): Stream<R, E | E2, A>
} = internal.timeoutFailCause

/**
 * Switches the stream if it does not produce a value after the specified
 * duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const timeoutTo: {
  <R2, E2, A2>(
    duration: Duration.DurationInput,
    that: Stream<R2, E2, A2>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    duration: Duration.DurationInput,
    that: Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, A | A2>
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
  ): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    capacity: number
  ): Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>
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
export const toPull: <R, E, A>(
  self: Stream<R, E, A>
) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>> = internal.toPull

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
    options?: {
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
      readonly capacity?: number | undefined
    } | {
      readonly strategy: "unbounded"
    }
  ): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Take.Take<E, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    options?: {
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
      readonly capacity?: number | undefined
    } | {
      readonly strategy: "unbounded"
    }
  ): Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Take.Take<E, A>>>
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
    options?: {
      readonly capacity?: number | undefined
    }
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    options?: {
      readonly capacity?: number | undefined
    }
  ): Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>
} = internal.toQueueOfElements

/**
 * Converts the stream to a `ReadableStream`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toReadableStream: <E, A>(source: Stream<never, E, A>) => ReadableStream<A> = internal.toReadableStream

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @since 2.0.0
 * @category utils
 */
export const transduce: {
  <R2, E2, A, Z>(sink: Sink.Sink<R2, E2, A, A, Z>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Z>
  <R, E, R2, E2, A, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, A, Z>): Stream<R | R2, E | E2, Z>
} = internal.transduce

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfold: <S, A>(s: S, f: (s: S) => Option.Option<readonly [A, S]>) => Stream<never, never, A> =
  internal.unfold

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldChunk: <S, A>(
  s: S,
  f: (s: S) => Option.Option<readonly [Chunk.Chunk<A>, S]>
) => Stream<never, never, A> = internal.unfoldChunk

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldChunkEffect: <R, E, A, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [Chunk.Chunk<A>, S]>>
) => Stream<R, E, A> = internal.unfoldChunkEffect

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfoldEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
) => Stream<R, E, A> = internal.unfoldEffect

/**
 * A stream that contains a single `Unit` value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unit: Stream<never, never, void> = internal.unit

/**
 * Creates a stream produced from an `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrap: <R, E, R2, E2, A>(effect: Effect.Effect<R, E, Stream<R2, E2, A>>) => Stream<R | R2, E | E2, A> =
  internal.unwrap

/**
 * Creates a stream produced from a scoped `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrapScoped: <R, E, R2, E2, A>(
  effect: Effect.Effect<R, E, Stream<R2, E2, A>>
) => Stream<R2 | Exclude<R, Scope.Scope>, E | E2, A> = internal.unwrapScoped

/**
 * Updates the specified service within the context of the `Stream`.
 *
 * @since 2.0.0
 * @category context
 */
export const updateService = internal.updateService

/**
 * Returns the specified stream if the given condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const when: {
  (test: LazyArg<boolean>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, test: LazyArg<boolean>): Stream<R, E, A>
} = internal.when

/**
 * Returns the resulting stream when the given `PartialFunction` is defined
 * for the given value, otherwise returns an empty stream.
 *
 * @since 2.0.0
 * @category constructors
 */
export const whenCase: <A, R, E, A2>(
  evaluate: LazyArg<A>,
  pf: (a: A) => Option.Option<Stream<R, E, A2>>
) => Stream<R, E, A2> = internal.whenCase

/**
 * Returns the stream when the given partial function is defined for the given
 * effectful value, otherwise returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const whenCaseEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Stream<R2, E2, A2>>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (a: A) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
} = internal.whenCaseEffect

/**
 * Returns the stream if the given effectful condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @since 2.0.0
 * @category utils
 */
export const whenEffect: {
  <R2, E2>(effect: Effect.Effect<R2, E2, boolean>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, boolean>): Stream<R | R2, E | E2, A>
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
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): Stream<R, E, A>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
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
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>
  ): <R, E, A extends ReadonlyArray<any>>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [...A, A2]>
  <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, [...A, A2]>
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
  <R2, E2, A2, A>(
    options: {
      readonly other: Stream<R2, E2, A2>
      readonly defaultSelf: A
      readonly defaultOther: A2
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, R2, E2, A2, A>(
    self: Stream<R, E, A>,
    options: {
      readonly other: Stream<R2, E2, A2>
      readonly defaultSelf: A
      readonly defaultOther: A2
    }
  ): Stream<R | R2, E | E2, [A, A2]>
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
  <R2, E2, A2, A>(that: Stream<R2, E2, A2>, defaultLeft: A): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, R2, E2, A2, A>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>, defaultLeft: A): Stream<R | R2, E | E2, A>
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
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>,
    defaultRight: A2
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>, defaultRight: A2): Stream<R | R2, E | E2, A2>
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
  <R2, E2, A2, A, K>(
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, [A, A2]]>
  <R, E, R2, E2, A2, A, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, [A, A2]]>
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
  <R2, E2, A2, A, K>(
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A]>
  <R, E, R2, E2, A2, A, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A]>
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
  <R2, E2, A2, K>(
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): <R, E, A>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A2]>
  <R, E, A, R2, E2, A2, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A2]>
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
  <R2, E2, A, A3, A2, K>(
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A3]>
  <R, E, R2, E2, A, A3, A2, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A3]>
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
  <R2, E2, A2, A, A3>(
    options: {
      readonly other: Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    options: {
      readonly other: Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): Stream<R | R2, E | E2, A3>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
} = internal.zipLatest

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
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream<R | R2, E | E2, A3>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
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
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
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
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream<R | R2, E | E2, A3>
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
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ): Stream<R | R2, E | E2, A3>
} = internal.zipWithChunks

/**
 * Zips each element with the next element if present.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithNext: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [A, Option.Option<A>]> = internal.zipWithNext

/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithPrevious: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [Option.Option<A>, A]> =
  internal.zipWithPrevious

/**
 * Zips each element with both the previous and next element.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithPreviousAndNext: <R, E, A>(
  self: Stream<R, E, A>
) => Stream<R, E, [Option.Option<A>, A, Option.Option<A>]> = internal.zipWithPreviousAndNext

/**
 * Zips this stream together with the index of elements.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWithIndex: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [A, number]> = internal.zipWithIndex

// -------------------------------------------------------------------------------------
// Do notation
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category do notation
 */
export const Do: Stream<never, never, {}> = internal.Do

/**
 * Binds a value from a stream in a `do` scope
 *
 * @since 2.0.0
 * @category do notation
 */
export const bind: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): <R, E>(self: Stream<R, E, K>) => Stream<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): Stream<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
} = internal.bind

/**
 * Binds an effectful value in a `do` scope
 *
 * @since 2.0.0
 * @category do notation
 */
export const bindEffect: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): <R, E>(self: Stream<R, E, K>) => Stream<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ): Stream<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
} = _groupBy.bindEffect

/**
 * @since 2.0.0
 * @category do notation
 */
export const bindTo: {
  <N extends string>(tag: N): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: Stream<R, E, A>, tag: N): Stream<R, E, Record<N, A>>
} = internal.bindTo

const let_: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <R, E>(self: Stream<R, E, K>) => Stream<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): Stream<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
} = internal.let_

export {
  /**
   * Bind a value in a `do` scope
   *
   * @since 2.0.0
   * @category do notation
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
  (encoding?: string): <R, E>(self: Stream<R, E, Uint8Array>) => Stream<R, E, string>
  <R, E>(self: Stream<R, E, Uint8Array>, encoding?: string): Stream<R, E, string>
} = internal.decodeText

/**
 * Encode a stream of strings into a stream of Uint8Array chunks using the specified encoding.
 *
 * @since 2.0.0
 * @category encoding
 */
export const encodeText: <R, E>(self: Stream<R, E, string>) => Stream<R, E, Uint8Array> = internal.encodeText
