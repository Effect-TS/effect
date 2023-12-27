/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Channel from "./Channel.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as Exit from "./Exit.js"
import type { LazyArg } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import type * as HashSet from "./HashSet.js"
import * as internal from "./internal/sink.js"
import type * as MergeDecision from "./MergeDecision.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type * as PubSub from "./PubSub.js"
import type * as Queue from "./Queue.js"
import type * as Scope from "./Scope.js"
import type * as Types from "./Types.js"
import type * as Unify from "./Unify.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const SinkTypeId: unique symbol = internal.SinkTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SinkTypeId = typeof SinkTypeId

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
export interface Sink<out R, out E, in In, out L, out Z> extends Sink.Variance<R, E, In, L, Z>, Pipeable {}

/**
 * @since 2.0.0
 * @category models
 */
export interface SinkUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Sink?: () => A[Unify.typeSymbol] extends
    | Sink<
      infer R,
      infer E,
      infer In,
      infer L,
      infer Z
    >
    | infer _ ? Sink<R, E, In, L, Z>
    : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface SinkUnifyIgnore extends Effect.EffectUnifyIgnore {
  Sink?: true
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Effect.js" {
  interface Effect<R, E, A> extends Sink<R, E, unknown, never, A> {}
  interface EffectUnifyIgnore {
    Sink?: true
  }
}

/**
 * @since 2.0.0
 */
export declare namespace Sink {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out R, out E, in In, out L, out Z> {
    readonly [SinkTypeId]: VarianceStruct<R, E, In, L, Z>
  }
  /**
   * @since 2.0.0
   * @category models
   */
  export interface VarianceStruct<out R, out E, in In, out L, out Z> {
    _R: Types.Covariant<R>
    _E: Types.Covariant<E>
    _In: Types.Contravariant<In>
    _L: Types.Covariant<L>
    _Z: Types.Covariant<Z>
  }
}

/**
 * Replaces this sink's result with the provided value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <Z2>(z: Z2): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>
  <R, E, In, L, Z, Z2>(self: Sink<R, E, In, L, Z>, z: Z2): Sink<R, E, In, L, Z2>
} = internal.as

/**
 * A sink that collects all elements into a `Chunk`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAll: <In>() => Sink<never, never, In, never, Chunk.Chunk<In>> = internal.collectAll

/**
 * A sink that collects first `n` elements into a chunk.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllN: <In>(n: number) => Sink<never, never, In, In, Chunk.Chunk<In>> = internal.collectAllN

/**
 * Repeatedly runs the sink and accumulates its results into a `Chunk`.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectAllFrom: <R, E, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, L, Chunk.Chunk<Z>> = internal.collectAllFrom

/**
 * A sink that collects all of its inputs into a map. The keys are extracted
 * from inputs using the keying function `key`; if multiple inputs use the
 * same key, they are merged using the `merge` function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllToMap: <In, K>(
  key: (input: In) => K,
  merge: (x: In, y: In) => In
) => Sink<never, never, In, never, HashMap.HashMap<K, In>> = internal.collectAllToMap

/**
 * A sink that collects first `n` keys into a map. The keys are calculated
 * from inputs using the keying function `key`; if multiple inputs use the the
 * same key, they are merged using the `merge` function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllToMapN: <In, K>(
  n: number,
  key: (input: In) => K,
  merge: (x: In, y: In) => In
) => Sink<never, never, In, In, HashMap.HashMap<K, In>> = internal.collectAllToMapN

/**
 * A sink that collects all of its inputs into a set.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllToSet: <In>() => Sink<never, never, In, never, HashSet.HashSet<In>> = internal.collectAllToSet

/**
 * A sink that collects first `n` distinct inputs into a set.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllToSetN: <In>(n: number) => Sink<never, never, In, In, HashSet.HashSet<In>> =
  internal.collectAllToSetN

/**
 * Accumulates incoming elements into a chunk until predicate `p` is
 * satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllUntil: <In>(p: Predicate<In>) => Sink<never, never, In, In, Chunk.Chunk<In>> =
  internal.collectAllUntil

/**
 * Accumulates incoming elements into a chunk until effectful predicate `p` is
 * satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllUntilEffect: <In, R, E>(
  p: (input: In) => Effect.Effect<R, E, boolean>
) => Sink<R, E, In, In, Chunk.Chunk<In>> = internal.collectAllUntilEffect

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate
 * `p`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllWhile: {
  <In, Out extends In>(refinement: Refinement<In, Out>): Sink<never, never, In, In, Chunk.Chunk<Out>>
  <In>(predicate: Predicate<In>): Sink<never, never, In, In, Chunk.Chunk<In>>
} = internal.collectAllWhile

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful
 * predicate `p`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllWhileEffect: <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
) => Sink<R, E, In, In, Chunk.Chunk<In>> = internal.collectAllWhileEffect

/**
 * Repeatedly runs the sink for as long as its results satisfy the predicate
 * `p`. The sink's results will be accumulated using the stepping function `f`.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectAllWhileWith: {
  <Z, S>(
    options: {
      readonly initial: S
      readonly while: Predicate<Z>
      readonly body: (s: S, z: Z) => S
    }
  ): <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, S>
  <R, E, In, L extends In, Z, S>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly initial: S
      readonly while: Predicate<Z>
      readonly body: (s: S, z: Z) => S
    }
  ): Sink<R, E, In, L, S>
} = internal.collectAllWhileWith as any

/**
 * Collects the leftovers from the stream when the sink succeeds and returns
 * them as part of the sink's result.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectLeftover: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, never, [Z, Chunk.Chunk<L>]> = internal.collectLeftover

/**
 * Transforms this sink's input elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInput = internal.mapInput

/**
 * Effectfully transforms this sink's input elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInputEffect = internal.mapInputEffect

/**
 * Transforms this sink's input chunks. `f` must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInputChunks: {
  <In0, In>(
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z>
  <R, E, L, Z, In0, In>(
    self: Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ): Sink<R, E, In0, L, Z>
} = internal.mapInputChunks

/**
 * Effectfully transforms this sink's input chunks. `f` must preserve
 * chunking-invariance.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInputChunksEffect: {
  <In0, R2, E2, In>(
    f: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In0, L, Z>
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
  ): Sink<R | R2, E | E2, In0, L, Z>
} = internal.mapInputChunksEffect

/**
 * A sink that counts the number of elements fed to it.
 *
 * @since 2.0.0
 * @category constructors
 */
export const count: Sink<never, never, unknown, never, number> = internal.count

/**
 * Creates a sink halting with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Sink<never, never, unknown, never, never> = internal.die

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Sink<never, never, unknown, never, never> = internal.dieMessage

/**
 * Creates a sink halting with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Sink<never, never, unknown, never, never> = internal.dieSync

/**
 * Transforms both inputs and result of this sink using the provided
 * functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const dimap: {
  <In0, In, Z, Z2>(
    options: {
      readonly onInput: (input: In0) => In
      readonly onDone: (z: Z) => Z2
    }
  ): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z2>
  <R, E, L, In0, In, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => In
      readonly onDone: (z: Z) => Z2
    }
  ): Sink<R, E, In0, L, Z2>
} = internal.dimap

/**
 * Effectfully transforms both inputs and result of this sink using the
 * provided functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const dimapEffect: {
  <In0, R2, E2, In, Z, R3, E3, Z2>(
    options: {
      readonly onInput: (input: In0) => Effect.Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => Effect.Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2>
} = internal.dimapEffect

/**
 * Transforms both input chunks and result of this sink using the provided
 * functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const dimapChunks: {
  <In0, In, Z, Z2>(
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
      readonly onDone: (z: Z) => Z2
    }
  ): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z2>
  <R, E, L, In0, In, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
      readonly onDone: (z: Z) => Z2
    }
  ): Sink<R, E, In0, L, Z2>
} = internal.dimapChunks

/**
 * Effectfully transforms both input chunks and result of this sink using the
 * provided functions. `f` and `g` must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category mapping
 */
export const dimapChunksEffect: {
  <In0, R2, E2, In, Z, R3, E3, Z2>(
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2>
} = internal.dimapChunksEffect

/**
 * A sink that ignores its inputs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const drain: Sink<never, never, unknown, never, void> = internal.drain

/**
 * Creates a sink that drops `n` elements.
 *
 * @since 2.0.0
 * @category constructors
 */
export const drop: <In>(n: number) => Sink<never, never, In, In, unknown> = internal.drop

/**
 * Drops incoming elements until the predicate is satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropUntil: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, unknown> = internal.dropUntil

/**
 * Drops incoming elements until the effectful predicate is satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropUntilEffect: <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
) => Sink<R, E, In, In, unknown> = internal.dropUntilEffect

/**
 * Drops incoming elements as long as the predicate is satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropWhile: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, unknown> = internal.dropWhile

/**
 * Drops incoming elements as long as the effectful predicate is satisfied.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropWhileEffect: <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
) => Sink<R, E, In, In, unknown> = internal.dropWhileEffect

/**
 * Returns a new sink with an attached finalizer. The finalizer is guaranteed
 * to be executed so long as the sink begins execution (and regardless of
 * whether or not it completes).
 *
 * @since 2.0.0
 * @category finalization
 */
export const ensuring: {
  <R2, _>(
    finalizer: Effect.Effect<R2, never, _>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E, In, L, Z>
  <R, E, In, L, Z, R2, _>(self: Sink<R, E, In, L, Z>, finalizer: Effect.Effect<R2, never, _>): Sink<R | R2, E, In, L, Z>
} = internal.ensuring

/**
 * Returns a new sink with an attached finalizer. The finalizer is guaranteed
 * to be executed so long as the sink begins execution (and regardless of
 * whether or not it completes).
 *
 * @since 2.0.0
 * @category finalization
 */
export const ensuringWith: {
  <E, Z, R2, _>(
    finalizer: (exit: Exit.Exit<E, Z>) => Effect.Effect<R2, never, _>
  ): <R, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E, In, L, Z>
  <R, In, L, E, Z, R2, _>(
    self: Sink<R, E, In, L, Z>,
    finalizer: (exit: Exit.Exit<E, Z>) => Effect.Effect<R2, never, _>
  ): Sink<R | R2, E, In, L, Z>
} = internal.ensuringWith

/**
 * Accesses the whole context of the sink.
 *
 * @since 2.0.0
 * @category constructors
 */
export const context: <R>() => Sink<R, never, unknown, never, Context.Context<R>> = internal.context

/**
 * Accesses the context of the sink.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWith: <R, Z>(f: (context: Context.Context<R>) => Z) => Sink<R, never, unknown, never, Z> =
  internal.contextWith

/**
 * Accesses the context of the sink in the context of an effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWithEffect: <R, R2, E, Z>(
  f: (context: Context.Context<R>) => Effect.Effect<R2, E, Z>
) => Sink<R | R2, E, unknown, never, Z> = internal.contextWithEffect

/**
 * Accesses the context of the sink in the context of a sink.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWithSink: <R0, R, E, In, L, Z>(
  f: (context: Context.Context<R0>) => Sink<R, E, In, L, Z>
) => Sink<R0 | R, E, In, L, Z> = internal.contextWithSink

/**
 * A sink that returns whether all elements satisfy the specified predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const every: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, boolean> = internal.every

/**
 * A sink that always fails with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(e: E) => Sink<never, E, unknown, never, never> = internal.fail

/**
 * A sink that always fails with the specified lazily evaluated error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Sink<never, E, unknown, never, never> = internal.failSync

/**
 * Creates a sink halting with a specified `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Sink<never, E, unknown, never, never> = internal.failCause

/**
 * Creates a sink halting with a specified lazily evaluated `Cause`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Sink<never, E, unknown, never, never> =
  internal.failCauseSync

/**
 * Filters the sink's input with the given predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterInput: {
  <In, In1 extends In, In2 extends In1>(
    f: Refinement<In1, In2>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In2, L, Z>
  <In, In1 extends In>(f: Predicate<In1>): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>
} = internal.filterInput

/**
 * Effectfully filter the input of this sink using the specified predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterInputEffect: {
  <R2, E2, In, In1 extends In>(
    f: (input: In1) => Effect.Effect<R2, E2, boolean>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In1, L, Z>
  <R, E, L, Z, R2, E2, In, In1 extends In>(
    self: Sink<R, E, In, L, Z>,
    f: (input: In1) => Effect.Effect<R2, E2, boolean>
  ): Sink<R | R2, E | E2, In1, L, Z>
} = internal.filterInputEffect

/**
 * Creates a sink that produces values until one verifies the predicate `f`.
 *
 * @since 2.0.0
 * @category elements
 */
export const findEffect: {
  <Z, R2, E2>(
    f: (z: Z) => Effect.Effect<R2, E2, boolean>
  ): <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Option.Option<Z>>
  <R, E, In, L extends In, Z, R2, E2>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, boolean>
  ): Sink<R | R2, E | E2, In, L, Option.Option<Z>>
} = internal.findEffect as any

/**
 * A sink that folds its inputs with the provided function, termination
 * predicate and initial state.
 *
 * @since 2.0.0
 * @category folding
 */
export const fold: <S, In>(s: S, contFn: Predicate<S>, f: (z: S, input: In) => S) => Sink<never, never, In, In, S> =
  internal.fold

/**
 * Folds over the result of the sink
 *
 * @since 2.0.0
 * @category folding
 */
export const foldSink: {
  <R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    options: {
      readonly onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
    }
  ): <R>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R2 | R, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
  <R, R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
    }
  ): Sink<R | R1 | R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
} = internal.foldSink

/**
 * A sink that folds its input chunks with the provided function, termination
 * predicate and initial state. `contFn` condition is checked only for the
 * initial value and at the end of processing of each chunk. `f` and `contFn`
 * must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldChunks: <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
) => Sink<never, never, In, never, S> = internal.foldChunks

/**
 * A sink that effectfully folds its input chunks with the provided function,
 * termination predicate and initial state. `contFn` condition is checked only
 * for the initial value and at the end of processing of each chunk. `f` and
 * `contFn` must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldChunksEffect: <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect.Effect<R, E, S>
) => Sink<R, E, In, In, S> = internal.foldChunksEffect

/**
 * A sink that effectfully folds its inputs with the provided function,
 * termination predicate and initial state.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldEffect: <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
) => Sink<R, E, In, In, S> = internal.foldEffect

/**
 * A sink that folds its inputs with the provided function and initial state.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldLeft: <S, In>(s: S, f: (s: S, input: In) => S) => Sink<never, never, In, never, S> = internal.foldLeft

/**
 * A sink that folds its input chunks with the provided function and initial
 * state. `f` must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldLeftChunks: <S, In>(s: S, f: (s: S, chunk: Chunk.Chunk<In>) => S) => Sink<never, never, In, never, S> =
  internal.foldLeftChunks

/**
 * A sink that effectfully folds its input chunks with the provided function
 * and initial state. `f` must preserve chunking-invariance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldLeftChunksEffect: <S, R, E, In>(
  s: S,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect.Effect<R, E, S>
) => Sink<R, E, In, never, S> = internal.foldLeftChunksEffect

/**
 * A sink that effectfully folds its inputs with the provided function and
 * initial state.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldLeftEffect: <S, R, E, In>(
  s: S,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
) => Sink<R, E, In, In, S> = internal.foldLeftEffect

/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S` until `max` elements have been folded.
 *
 * Like `Sink.foldWeighted`, but with a constant cost function of `1`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldUntil: <In, S>(s: S, max: number, f: (z: S, input: In) => S) => Sink<never, never, In, In, S> =
  internal.foldUntil

/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S` until `max` elements have been folded.
 *
 * Like `Sink.foldWeightedEffect` but with a constant cost function of `1`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldUntilEffect: <S, R, E, In>(
  s: S,
  max: number,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
) => Sink<R, E, In, In, S> = internal.foldUntilEffect

/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S`, until `max` worth of elements (determined by the `costFn`) have been
 * folded.
 *
 * @note
 *   Elements that have an individual cost larger than `max` will force the
 *   sink to cross the `max` cost. See `Sink.foldWeightedDecompose` for a
 *   variant that can handle these cases.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldWeighted: <S, In>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => number
    readonly body: (s: S, input: In) => S
  }
) => Sink<never, never, In, In, S> = internal.foldWeighted

/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S`, until `max` worth of elements (determined by the `costFn`) have been
 * folded.
 *
 * The `decompose` function will be used for decomposing elements that cause
 * an `S` aggregate to cross `max` into smaller elements. For example:
 *
 * ```ts
 * pipe(
 *   Stream.make(1, 5, 1),
 *   Stream.transduce(
 *     Sink.foldWeightedDecompose(
 *       Chunk.empty<number>(),
 *       4,
 *       (n: number) => n,
 *       (n: number) => Chunk.make(n - 1, 1),
 *       (acc, el) => pipe(acc, Chunk.append(el))
 *     )
 *   ),
 *   Stream.runCollect
 * )
 * ```
 *
 * The stream would emit the elements `Chunk(1), Chunk(4), Chunk(1, 1)`.
 *
 * Be vigilant with this function, it has to generate "simpler" values or the
 * fold may never end. A value is considered indivisible if `decompose` yields
 * the empty chunk or a single-valued chunk. In these cases, there is no other
 * choice than to yield a value that will cross the threshold.
 *
 * `Sink.foldWeightedDecomposeEffect` allows the decompose function to return an
 * effect value, and consequently it allows the sink to fail.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldWeightedDecompose: <S, In>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => number
    readonly decompose: (input: In) => Chunk.Chunk<In>
    readonly body: (s: S, input: In) => S
  }
) => Sink<never, never, In, In, S> = internal.foldWeightedDecompose

/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S`, until `max` worth of elements (determined by the
 * `costFn`) have been folded.
 *
 * The `decompose` function will be used for decomposing elements that cause
 * an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never
 * end. A value is considered indivisible if `decompose` yields the empty
 * chunk or a single-valued chunk. In these cases, there is no other choice
 * than to yield a value that will cross the threshold.
 *
 * See `Sink.foldWeightedDecompose` for an example.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldWeightedDecomposeEffect: <S, In, R, E, R2, E2, R3, E3>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => Effect.Effect<R, E, number>
    readonly decompose: (input: In) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
    readonly body: (s: S, input: In) => Effect.Effect<R3, E3, S>
  }
) => Sink<R | R2 | R3, E | E2 | E3, In, In, S> = internal.foldWeightedDecomposeEffect

/**
 * Creates a sink that effectfully folds elements of type `In` into a
 * structure of type `S`, until `max` worth of elements (determined by the
 * `costFn`) have been folded.
 *
 * @note
 *   Elements that have an individual cost larger than `max` will force the
 *   sink to cross the `max` cost. See `Sink.foldWeightedDecomposeEffect` for
 *   a variant that can handle these cases.
 *
 * @since 2.0.0
 * @category constructors
 */
export const foldWeightedEffect: <S, In, R, E, R2, E2>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => Effect.Effect<R, E, number>
    readonly body: (s: S, input: In) => Effect.Effect<R2, E2, S>
  }
) => Sink<R | R2, E | E2, In, In, S> = internal.foldWeightedEffect

/**
 * A sink that executes the provided effectful function for every element fed
 * to it.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forEach: <In, R, E, _>(f: (input: In) => Effect.Effect<R, E, _>) => Sink<R, E, In, never, void> =
  internal.forEach

/**
 * A sink that executes the provided effectful function for every chunk fed to
 * it.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forEachChunk: <In, R, E, _>(
  f: (input: Chunk.Chunk<In>) => Effect.Effect<R, E, _>
) => Sink<R, E, In, never, void> = internal.forEachChunk

/**
 * A sink that executes the provided effectful function for every chunk fed to
 * it until `f` evaluates to `false`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forEachChunkWhile: <In, R, E>(
  f: (input: Chunk.Chunk<In>) => Effect.Effect<R, E, boolean>
) => Sink<R, E, In, In, void> = internal.forEachChunkWhile

/**
 * A sink that executes the provided effectful function for every element fed
 * to it until `f` evaluates to `false`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forEachWhile: <In, R, E>(f: (input: In) => Effect.Effect<R, E, boolean>) => Sink<R, E, In, In, void> =
  internal.forEachWhile

/**
 * Runs this sink until it yields a result, then uses that result to create
 * another sink from the provided function which will continue to run until it
 * yields a result.
 *
 * This function essentially runs sinks in sequence.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L | L1, Z1>
  <R, E, R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
  ): Sink<R | R1, E | E1, In & In1, L | L1, Z1>
} = internal.flatMap

/**
 * Creates a sink from a `Channel`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromChannel: <R, E, In, L, Z>(
  channel: Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z>
) => Sink<R, E, In, L, Z> = internal.fromChannel

/**
 * Creates a `Channel` from a Sink.
 *
 * @since 2.0.0
 * @category constructors
 */
export const toChannel: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z> = internal.toChannel

/**
 * Creates a single-value sink produced from an effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <R, E, Z>(effect: Effect.Effect<R, E, Z>) => Sink<R, E, unknown, never, Z> =
  internal.fromEffect

/**
 * Create a sink which publishes each element to the specified `PubSub`.
 *
 * @param shutdown If `true`, the `PubSub` will be shutdown after the sink is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromPubSub: <In>(
  pubsub: PubSub.PubSub<In>,
  options?: {
    readonly shutdown?: boolean | undefined
  }
) => Sink<never, never, In, never, void> = internal.fromPubSub

/**
 * Creates a sink from a chunk processing function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromPush: <R, E, In, L, Z>(
  push: Effect.Effect<
    R,
    never,
    (_: Option.Option<Chunk.Chunk<In>>) => Effect.Effect<R, readonly [Either.Either<E, Z>, Chunk.Chunk<L>], void>
  >
) => Sink<Exclude<R, Scope.Scope>, E, In, L, Z> = internal.fromPush

/**
 * Create a sink which enqueues each element into the specified queue.
 *
 * @param shutdown If `true`, the queue will be shutdown after the sink is evaluated (defaults to `false`)
 * @since 2.0.0
 * @category constructors
 */
export const fromQueue: <In>(
  queue: Queue.Enqueue<In>,
  options?: {
    readonly shutdown?: boolean | undefined
  }
) => Sink<never, never, In, never, void> = internal.fromQueue

/**
 * Creates a sink containing the first value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const head: <In>() => Sink<never, never, In, In, Option.Option<In>> = internal.head

/**
 * Drains the remaining elements from the stream after the sink finishes
 *
 * @since 2.0.0
 * @category utils
 */
export const ignoreLeftover: <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, never, Z> =
  internal.ignoreLeftover

/**
 * Creates a sink containing the last value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const last: <In>() => Sink<never, never, In, In, Option.Option<In>> = internal.last

/**
 * Creates a sink that does not consume any input but provides the given chunk
 * as its leftovers
 *
 * @since 2.0.0
 * @category constructors
 */
export const leftover: <L>(chunk: Chunk.Chunk<L>) => Sink<never, never, unknown, L, void> = internal.leftover

/**
 * Transforms this sink's result.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <Z, Z2>(f: (z: Z) => Z2): <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>
  <R, E, In, L, Z, Z2>(self: Sink<R, E, In, L, Z>, f: (z: Z) => Z2): Sink<R, E, In, L, Z2>
} = internal.map

/**
 * Effectfully transforms this sink's result.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapEffect: {
  <Z, R2, E2, Z2>(
    f: (z: Z) => Effect.Effect<R2, E2, Z2>
  ): <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Z2>
  <R, E, In, L, Z, R2, E2, Z2>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, Z2>
  ): Sink<R | R2, E | E2, In, L, Z2>
} = internal.mapEffect

/**
 * Transforms the errors emitted by this sink using `f`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>
  <R, In, L, Z, E, E2>(self: Sink<R, E, In, L, Z>, f: (error: E) => E2): Sink<R, E2, In, L, Z>
} = internal.mapError

/**
 * Transforms the leftovers emitted by this sink using `f`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapLeftover: {
  <L, L2>(f: (leftover: L) => L2): <R, E, In, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L2, Z>
  <R, E, In, Z, L, L2>(self: Sink<R, E, In, L, Z>, f: (leftover: L) => L2): Sink<R, E, In, L2, Z>
} = internal.mapLeftover

/**
 * Creates a sink which transforms it's inputs into a string.
 *
 * @since 2.0.0
 * @category constructors
 */
export const mkString: Sink<never, never, unknown, never, string> = internal.mkString

/**
 * Creates a sink which never terminates.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: Sink<never, never, unknown, never, never> = internal.never

/**
 * Switch to another sink in case of failure
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElse: {
  <R2, E2, In2, L2, Z2>(
    that: LazyArg<Sink<R2, E2, In2, L2, Z2>>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L2 | L, Z2 | Z>
  <R, E, In, L, Z, R2, E2, In2, L2, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: LazyArg<Sink<R2, E2, In2, L2, Z2>>
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z | Z2>
} = internal.orElse

/**
 * Provides the sink with its required context, which eliminates its
 * dependency on `R`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(context: Context.Context<R>): <E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<never, E, In, L, Z>
  <E, In, L, Z, R>(self: Sink<R, E, In, L, Z>, context: Context.Context<R>): Sink<never, E, In, L, Z>
} = internal.provideContext

/**
 * Runs both sinks in parallel on the input, , returning the result or the
 * error from the one that finishes first.
 *
 * @since 2.0.0
 * @category utils
 */
export const race: {
  <R1, E1, In1, L1, Z1>(
    that: Sink<R1, E1, In1, L1, Z1>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1 | Z>
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R1, E1, In1, L1, Z1>
  ): Sink<R | R1, E | E1, In & In1, L | L1, Z | Z1>
} = internal.race

/**
 * Runs both sinks in parallel on the input, returning the result or the error
 * from the one that finishes first.
 *
 * @since 2.0.0
 * @category utils
 */
export const raceBoth: {
  <R1, E1, In1, L1, Z1>(
    that: Sink<R1, E1, In1, L1, Z1>,
    options?: {
      readonly capacity?: number | undefined
    }
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Either.Either<Z, Z1>>
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R1, E1, In1, L1, Z1>,
    options?: {
      readonly capacity?: number | undefined
    }
  ): Sink<R | R1, E | E1, In & In1, L | L1, Either.Either<Z, Z1>>
} = internal.raceBoth

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 *
 * @since 2.0.0
 * @category utils
 */
export const raceWith: {
  <R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    options: {
      readonly other: Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit.Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit.Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ): <R, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L2 | L, Z3 | Z4>
  <R, In, L, R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly other: Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit.Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit.Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ): Sink<R | R2, E2 | E, In & In2, L | L2, Z3 | Z4>
} = internal.raceWith

/**
 * @since 2.0.0
 * @category error handling
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>
  <R, In, L, Z, E, E2>(self: Sink<R, E, In, L, Z>, pf: (error: E) => Option.Option<E2>): Sink<R, E2, In, L, Z>
} = internal.refineOrDie

/**
 * @since 2.0.0
 * @category error handling
 */
export const refineOrDieWith: <E, E2>(
  pf: (error: E) => Option.Option<E2>,
  f: (error: E) => unknown
) => <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z> = internal.refineOrDieWith

/**
 * A sink that returns whether an element satisfies the specified predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const some: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, boolean> = internal.some

/**
 * Splits the sink on the specified predicate, returning a new sink that
 * consumes elements until an element after the first satisfies the specified
 * predicate.
 *
 * @since 2.0.0
 * @category utils
 */
export const splitWhere: {
  <In>(f: Predicate<In>): <R, E, L extends In, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, In, Z>
  <R, E, L extends In, Z, In>(self: Sink<R, E, In, L, Z>, f: Predicate<In>): Sink<R, E, In, In, Z>
} = internal.splitWhere

/**
 * A sink that immediately ends with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <Z>(z: Z) => Sink<never, never, unknown, never, Z> = internal.succeed

/**
 * A sink that sums incoming numeric values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sum: Sink<never, never, number, never, number> = internal.sum

/**
 * Summarize a sink by running an effect when the sink starts and again when
 * it completes.
 *
 * @since 2.0.0
 * @category utils
 */
export const summarized: {
  <R2, E2, Z2, Z3>(
    summary: Effect.Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, [Z, Z3]>
  <R, E, In, L, Z, R2, E2, Z2, Z3>(
    self: Sink<R, E, In, L, Z>,
    summary: Effect.Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ): Sink<R | R2, E | E2, In, L, [Z, Z3]>
} = internal.summarized

/**
 * Returns a lazily constructed sink that may require effects for its
 * creation.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <R, E, In, L, Z>(evaluate: LazyArg<Sink<R, E, In, L, Z>>) => Sink<R, E, In, L, Z> =
  internal.suspend

/**
 * A sink that immediately ends with the specified lazy value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <Z>(evaluate: LazyArg<Z>) => Sink<never, never, unknown, never, Z> = internal.sync

/**
 * A sink that takes the specified number of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const take: <In>(n: number) => Sink<never, never, In, In, Chunk.Chunk<In>> = internal.take

/**
 * @since 2.0.0
 * @category constructors
 */
export const timed: Sink<never, never, unknown, never, Duration.Duration> = internal.timed

/**
 * Creates a sink produced from an effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrap: <R, E, R2, E2, In, L, Z>(
  effect: Effect.Effect<R, E, Sink<R2, E2, In, L, Z>>
) => Sink<R | R2, E | E2, In, L, Z> = internal.unwrap

/**
 * Creates a sink produced from a scoped effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrapScoped: <R, E, In, L, Z>(
  effect: Effect.Effect<R, E, Sink<R, E, In, L, Z>>
) => Sink<Exclude<R, Scope.Scope>, E, In, L, Z> = internal.unwrapScoped

/**
 * Returns the sink that executes this one and times its execution.
 *
 * @since 2.0.0
 * @category utils
 */
export const withDuration: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, L, [Z, Duration.Duration]> = internal.withDuration

/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results into a tuple.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, [Z, Z2]>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink<R | R2, E | E2, In & In2, L | L2, [Z, Z2]>
} = internal.zip

/**
 * Like `Sink.zip` but keeps only the result from this sink.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z>
} = internal.zipLeft

/**
 * Like `Sink.zip` but keeps only the result from `that` sink.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z2>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z2>
} = internal.zipRight

/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results with `f`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    that: Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z3>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z3>
} = internal.zipWith
