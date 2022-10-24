import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus type effect/core/stream/Channel/UpstreamPullStrategy
 * @category model
 * @since 1.0.0
 */
export type UpstreamPullStrategy<A> = PullAfterNext<A> | PullAfterAllEnqueued<A>

/**
 * @category model
 * @since 1.0.0
 */
export class PullAfterNext<A> {
  readonly _tag = "PullAfterNext"
  constructor(readonly emitSeparator: Option<A>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class PullAfterAllEnqueued<A> {
  readonly _tag = "PullAfterAllEnqueued"
  constructor(readonly emitSeparator: Option<A>) {}
}

/**
 * @tsplus type effect/core/stream/Channel/UpstreamPullStrategy.Ops
 * @category model
 * @since 1.0.0
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
 * @category constructors
 * @since 1.0.0
 */
export function pullAfterNext<A>(emitSeparator: Option<A>): UpstreamPullStrategy<A> {
  return new PullAfterNext(emitSeparator)
}

/**
 * @tsplus static effect/core/stream/Channel/UpstreamPullStrategy.Ops PullAfterAllEnqueued
 * @category constructors
 * @since 1.0.0
 */
export function pullAfterAllEnqueued<A>(
  emitSeparator: Option<A>
): UpstreamPullStrategy<A> {
  return new PullAfterAllEnqueued(emitSeparator)
}
