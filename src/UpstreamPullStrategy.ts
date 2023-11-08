import type { PullAfterAllEnqueued, PullAfterNext, UpstreamPullStrategyTypeId } from "./UpstreamPullStrategy.impl.js"

export * from "./internal/Jumpers/UpstreamPullStrategy.js"
export * from "./UpstreamPullStrategy.impl.js"

export declare namespace UpstreamPullStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./UpstreamPullStrategy.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type UpstreamPullStrategy<A> = PullAfterNext<A> | PullAfterAllEnqueued<A>

/**
 * @since 2.0.0
 */
export namespace UpstreamPullStrategy {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [UpstreamPullStrategyTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
