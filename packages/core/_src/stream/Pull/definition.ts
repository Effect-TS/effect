/**
 * @tsplus type ets/Pull
 */
export type Pull<R, E, A> = Effect<R, Maybe<E>, Chunk<A>>

/**
 * @tsplus type ets/Pull/Ops
 */
export interface PullOps {
  $: PullAspects
}
export const Pull: PullOps = {
  $: {}
}

/**
 * @tsplus type ets/Pull/Aspects
 */
export interface PullAspects {}
