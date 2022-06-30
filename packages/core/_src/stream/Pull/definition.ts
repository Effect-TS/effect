/**
 * @tsplus type effect/core/stream/Pull
 */
export type Pull<R, E, A> = Effect<R, Maybe<E>, Chunk<A>>

/**
 * @tsplus type effect/core/stream/Pull.Ops
 */
export interface PullOps {
  $: PullAspects
}
export const Pull: PullOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Pull.Aspects
 */
export interface PullAspects {}
