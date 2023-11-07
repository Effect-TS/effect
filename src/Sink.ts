import type { SinkTypeId } from "./impl/Sink.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/Sink.js"
export * from "./internal/Jumpers/Sink.js"

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
export interface Sink<R, E, In, L, Z> extends Sink.Variance<R, E, In, L, Z>, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace Sink {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<R, E, In, L, Z> {
    readonly [SinkTypeId]: VarianceStruct<R, E, In, L, Z>
  }
  /**
   * @since 2.0.0
   * @category models
   */
  export interface VarianceStruct<R, E, In, L, Z> {
    _R: (_: never) => R
    _E: (_: never) => E
    _In: (_: In) => void
    _L: (_: never) => L
    _Z: (_: never) => Z
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Sink.js"
}
