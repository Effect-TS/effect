import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus type effect/core/stream/Pull
 * @category model
 * @since 1.0.0
 */
export type Pull<R, E, A> = Effect<R, Option<E>, Chunk<A>>

/**
 * @tsplus type effect/core/stream/Pull.Ops
 * @category model
 * @since 1.0.0
 */
export interface PullOps {
  $: PullAspects
}
export const Pull: PullOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Pull.Aspects
 * @category model
 * @since 1.0.0
 */
export interface PullAspects {}
