/**
 * @since 2.0.0
 */
import type { NoUpstream, Pulled, UpstreamPullRequestTypeId } from "./impl/UpstreamPullRequest.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/UpstreamPullRequest.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/UpstreamPullRequest.js"
/**
 * @since 2.0.0
 */
export declare namespace UpstreamPullRequest {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/UpstreamPullRequest.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream

/**
 * @since 2.0.0
 */
export declare namespace UpstreamPullRequest {
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
