/**
 * @tsplus type ets/Stream/TerminationStrategy
 */
export type TerminationStrategy = Left | Right | Both | Either

export interface Left {
  readonly _tag: "Left"
}

export interface Right {
  readonly _tag: "Right"
}

export interface Both {
  readonly _tag: "Both"
}

export interface Either {
  readonly _tag: "Either"
}

/**
 * @tsplus type ets/Stream/TerminationStrategyOps
 */
export interface TerminationStrategyOps {}
export const TerminationStrategy: TerminationStrategyOps = {}

/**
 * @tsplus static ets/Stream/TerminationStrategyOps Left
 */
export const left: TerminationStrategy = {
  _tag: "Left"
}

/**
 * @tsplus static ets/Stream/TerminationStrategyOps Right
 */
export const right: TerminationStrategy = {
  _tag: "Right"
}

/**
 * @tsplus static ets/Stream/TerminationStrategyOps Both
 */
export const both: TerminationStrategy = {
  _tag: "Both"
}

/**
 * @tsplus static ets/Stream/TerminationStrategyOps Either
 */
export const either: TerminationStrategy = {
  _tag: "Either"
}
