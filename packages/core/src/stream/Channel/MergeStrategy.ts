/**
 * @tsplus type effect/core/stream/Channel/MergeStrategy
 * @category model
 * @since 1.0.0
 */
export type MergeStrategy = BackPressure | BufferSliding

/**
 * @category model
 * @since 1.0.0
 */
export interface BackPressure {
  readonly _tag: "BackPressure"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface BufferSliding {
  readonly _tag: "BufferSliding"
}

/**
 * @tsplus type effect/core/stream/Channel/MergeStrategy.Ops
 * @category model
 * @since 1.0.0
 */
export interface MergeStrategyOps {}
export const MergeStrategy: MergeStrategyOps = {}

/**
 * @tsplus static effect/core/stream/Channel/MergeStrategy.Ops BackPressure
 * @category constructors
 * @since 1.0.0
 */
export const BackPressure: MergeStrategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static effect/core/stream/Channel/MergeStrategy.Ops BufferSliding
 * @category constructors
 * @since 1.0.0
 */
export const BufferSliding: MergeStrategy = {
  _tag: "BufferSliding"
}
