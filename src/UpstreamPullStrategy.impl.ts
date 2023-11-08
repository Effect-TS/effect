/**
 * @since 2.0.0
 */
import * as internal from "./internal/channel/upstreamPullStrategy.js"
import type { Option } from "./Option.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const UpstreamPullStrategyTypeId: unique symbol = internal.UpstreamPullStrategyTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type UpstreamPullStrategyTypeId = typeof UpstreamPullStrategyTypeId

import type { UpstreamPullStrategy } from "../../UpstreamPullStrategy.js"

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
}

/**
 * @since 2.0.0
 * @category models
 */
export interface PullAfterNext<A> extends UpstreamPullStrategy.Variance<A> {
  readonly _tag: "PullAfterNext"
  readonly emitSeparator: Option<A>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface PullAfterAllEnqueued<A> extends UpstreamPullStrategy.Variance<A> {
  readonly _tag: "PullAfterAllEnqueued"
  readonly emitSeparator: Option<A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const PullAfterNext: <A>(emitSeparator: Option<A>) => UpstreamPullStrategy<A> = internal.PullAfterNext

/**
 * @since 2.0.0
 * @category constructors
 */
export const PullAfterAllEnqueued: <A>(emitSeparator: Option<A>) => UpstreamPullStrategy<A> =
  internal.PullAfterAllEnqueued

/**
 * Returns `true` if the specified value is an `UpstreamPullStrategy`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isUpstreamPullStrategy: (u: unknown) => u is UpstreamPullStrategy<unknown> =
  internal.isUpstreamPullStrategy

/**
 * Returns `true` if the specified `UpstreamPullStrategy` is a `PullAfterNext`,
 * `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isPullAfterNext: <A>(self: UpstreamPullStrategy<A>) => self is PullAfterNext<A> = internal.isPullAfterNext

/**
 * Returns `true` if the specified `UpstreamPullStrategy` is a
 * `PullAfterAllEnqueued`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isPullAfterAllEnqueued: <A>(self: UpstreamPullStrategy<A>) => self is PullAfterAllEnqueued<A> =
  internal.isPullAfterAllEnqueued

/**
 * Folds an `UpstreamPullStrategy<A>` into a value of type `Z`.
 *
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <A, Z>(
    options: {
      readonly onNext: (emitSeparator: Option<A>) => Z
      readonly onAllEnqueued: (emitSeparator: Option<A>) => Z
    }
  ): (self: UpstreamPullStrategy<A>) => Z
  <A, Z>(
    self: UpstreamPullStrategy<A>,
    options: {
      readonly onNext: (emitSeparator: Option<A>) => Z
      readonly onAllEnqueued: (emitSeparator: Option<A>) => Z
    }
  ): Z
} = internal.match
