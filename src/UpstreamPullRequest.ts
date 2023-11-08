import type { NoUpstream, Pulled, UpstreamPullRequestTypeId } from "./UpstreamPullRequest.impl.js"

export * from "./internal/Jumpers/UpstreamPullRequest.js"
export * from "./UpstreamPullRequest.impl.js"
export declare namespace UpstreamPullRequest {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./UpstreamPullRequest.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream

/**
 * @since 2.0.0
 */
export namespace UpstreamPullRequest {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [UpstreamPullRequestTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
