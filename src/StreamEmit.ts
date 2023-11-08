import type { Chunk } from "./Chunk.js"
import type { Effect } from "./Effect.js"
import type { Option } from "./Option.js"
import type { EmitOps } from "./StreamEmit.impl.js"

export * from "./internal/Jumpers/StreamEmit.js"
export * from "./StreamEmit.impl.js"

export declare namespace StreamEmit {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./StreamEmit.impl.js"
}
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
export interface StreamEmit<R, E, A, B> extends EmitOps<R, E, A, B> {
  (f: Effect<R, Option<E>, Chunk<A>>): Promise<B>
}
