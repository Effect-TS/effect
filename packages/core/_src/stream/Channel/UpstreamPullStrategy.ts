/**
 * @tsplus type ets/Channel/UpstreamPullStrategy
 */
export type UpstreamPullStrategy<A> = PullAfterNext<A> | PullAfterAllEnqueued<A>;

export class PullAfterNext<A> {
  readonly _tag = "PullAfterNext";
  constructor(readonly emitSeparator: Option<A>) {}
}

export class PullAfterAllEnqueued<A> {
  readonly _tag = "PullAfterAllEnqueued";
  constructor(readonly emitSeparator: Option<A>) {}
}

/**
 * @tsplus type ets/Channel/UpstreamPullStrategy/Ops
 */
export interface UpstreamPullStrategyOps {}
export const UpstreamPullStrategy: UpstreamPullStrategyOps = {};

/**
 * @tsplus unify ets/Channel/UpstreamPullStrategy
 */
export function unifyUpstreamPullStrategy<X extends UpstreamPullStrategy<any>>(
  self: X
): UpstreamPullStrategy<[X] extends [UpstreamPullStrategy<infer AX>] ? AX : never> {
  return self;
}

/**
 * @tsplus static ets/Channel/UpstreamPullStrategy/Ops PullAfterNext
 */
export function pullAfterNext<A>(emitSeparator: Option<A>): UpstreamPullStrategy<A> {
  return new PullAfterNext(emitSeparator);
}

/**
 * @tsplus static ets/Channel/UpstreamPullStrategy/Ops PullAfterAllEnqueued
 */
export function pullAfterAllEnqueued<A>(
  emitSeparator: Option<A>
): UpstreamPullStrategy<A> {
  return new PullAfterAllEnqueued(emitSeparator);
}
