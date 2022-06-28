/**
 * @tsplus type effect/core/stream/Channel/MergeStrategy
 */
export type MergeStrategy = BackPressure | BufferSliding

export interface BackPressure {
  readonly _tag: "BackPressure"
}

export interface BufferSliding {
  readonly _tag: "BufferSliding"
}

/**
 * @tsplus type effect/core/stream/Channel/MergeStrategy.Ops
 */
export interface MergeStrategyOps {}
export const MergeStrategy: MergeStrategyOps = {}

/**
 * @tsplus static effect/core/stream/Channel/MergeStrategy.Ops BackPressure
 */
export const BackPressure: MergeStrategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static effect/core/stream/Channel/MergeStrategy.Ops BufferSliding
 */
export const BufferSliding: MergeStrategy = {
  _tag: "BufferSliding"
}
