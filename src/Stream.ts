import type { Pipeable } from "./Pipeable.js"
import type { StreamTypeId, StreamUnify, StreamUnifyIgnore } from "./Stream.impl.js"
import type { Unify } from "./Unify.js"

export * from "./internal/Jumpers/Stream.js"
export * from "./Stream.impl.js"

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
export interface Stream<R, E, A> extends Stream.Variance<R, E, A>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: StreamUnify<this>
  [Unify.ignoreSymbol]?: StreamUnifyIgnore
}

/**
 * @since 2.0.0
 */
export declare namespace Stream {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<R, E, A> {
    readonly [StreamTypeId]: {
      _R: (_: never) => R
      _E: (_: never) => E
      _A: (_: never) => A
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

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Stream.impl.js"
}
