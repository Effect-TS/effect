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
 * @tsplus type ets/Channel/MergeStrategy/Ops
 */
export interface MergeStrategyOps {}
export const MergeStrategy: MergeStrategyOps = {}

/**
 * @tsplus static ets/Channel/MergeStrategy/Ops BackPressure
 */
export const BackPressure: MergeStrategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static ets/Channel/MergeStrategy/Ops BufferSliding
 */
export const BufferSliding: MergeStrategy = {
  _tag: "BufferSliding"
}
