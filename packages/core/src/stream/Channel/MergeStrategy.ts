/**
 * @tsplus type ets/Channel/MergeStrategy
 */
export type MergeStrategy = BackPressure | BufferSliding

export interface BackPressure {
  readonly _tag: "BackPressure"
}

export interface BufferSliding {
  readonly _tag: "BufferSliding"
}

/**
 * @tsplus type ets/Channel/MergeStrategyOps
 */
export interface MergeStrategyOps {}
export const MergeStrategy: MergeStrategyOps = {}

/**
 * @tsplus static ets/Channel/MergeStrategyOps BackPressure
 */
export const BackPressure: MergeStrategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static ets/Channel/MergeStrategyOps BufferSliding
 */
export const BufferSliding: MergeStrategy = {
  _tag: "BufferSliding"
}
