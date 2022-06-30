/**
 * @tsplus type effect/core/stream/Channel/UpstreamPullStrategy
 */
export type UpstreamPullStrategy<A> = PullAfterNext<A> | PullAfterAllEnqueued<A>

export class PullAfterNext<A> {
  readonly _tag = "PullAfterNext"
  constructor(readonly emitSeparator: Maybe<A>) {}
}

export class PullAfterAllEnqueued<A> {
  readonly _tag = "PullAfterAllEnqueued"
  constructor(readonly emitSeparator: Maybe<A>) {}
}

/**
 * @tsplus type effect/core/stream/Channel/UpstreamPullStrategy.Ops
 */
export interface UpstreamPullStrategyOps {}
export const UpstreamPullStrategy: UpstreamPullStrategyOps = {}

/**
 * @tsplus unify effect/core/stream/Channel/UpstreamPullStrategy
 */
export function unifyUpstreamPullStrategy<X extends UpstreamPullStrategy<any>>(
  self: X
): UpstreamPullStrategy<[X] extends [UpstreamPullStrategy<infer AX>] ? AX : never> {
  return self
}

/**
 * @tsplus static effect/core/stream/Channel/UpstreamPullStrategy.Ops PullAfterNext
 */
export function pullAfterNext<A>(emitSeparator: Maybe<A>): UpstreamPullStrategy<A> {
  return new PullAfterNext(emitSeparator)
}

/**
 * @tsplus static effect/core/stream/Channel/UpstreamPullStrategy.Ops PullAfterAllEnqueued
 */
export function pullAfterAllEnqueued<A>(
  emitSeparator: Maybe<A>
): UpstreamPullStrategy<A> {
  return new PullAfterAllEnqueued(emitSeparator)
}
