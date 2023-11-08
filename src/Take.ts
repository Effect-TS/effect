import type { Chunk } from "./Chunk.js"
import type { Exit } from "./Exit.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { TakeTypeId } from "./Take.impl.js"

export * from "./internal/Jumpers/Take.js"
export * from "./Take.impl.js"

/**
 * A `Take<E, A>` represents a single `take` from a queue modeling a stream of
 * values. A `Take` may be a failure cause `Cause<E>`, a chunk value `Chunk<A>`,
 * or an end-of-stream marker.
 *
 * @since 2.0.0
 * @category models
 */
export interface Take<E, A> extends Take.Variance<E, A>, Pipeable {
  /** @internal */
  readonly exit: Exit<Option<E>, Chunk<A>>
}

/**
 * @since 2.0.0
 */
export declare namespace Take {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [TakeTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Take.impl.js"
}
