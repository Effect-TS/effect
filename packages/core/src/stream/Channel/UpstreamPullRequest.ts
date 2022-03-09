/**
 * @tsplus type ets/Channel/UpstreamPullRequest
 */
export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream

export class Pulled<A> {
  readonly _tag = "Pulled"
  constructor(readonly value: A) {}
}

export class NoUpstream {
  readonly _tag = "NoUpstream"
  constructor(readonly activeDownstreamCount: number) {}
}

/**
 * @tsplus type ets/Channel/UpstreamPullRequestOps
 */
export interface UpstreamPullRequestOps {}
export const UpstreamPullRequest: UpstreamPullRequestOps = {}

/**
 * @tsplus unify ets/Channel/UpstreamPullRequest
 */
export function unifyUpstreamPullRequest<X extends UpstreamPullRequest<any>>(
  self: X
): UpstreamPullRequest<[X] extends [UpstreamPullRequest<infer AX>] ? AX : never> {
  return self
}

/**
 * @tsplus static ets/Channel/UpstreamPullRequestOps Pulled
 */
export function pulled<A>(value: A): UpstreamPullRequest<A> {
  return new Pulled(value)
}

/**
 * @tsplus static ets/Channel/UpstreamPullRequestOps NoUpstream
 */
export function noUpstream(activeDownstreamCount: number): UpstreamPullRequest<never> {
  return new NoUpstream(activeDownstreamCount)
}
