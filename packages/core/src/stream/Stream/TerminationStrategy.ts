/**
 * @tsplus type effect/core/stream/Stream/TerminationStrategy
 * @category model
 * @since 1.0.0
 */
export type TerminationStrategy = Left | Right | Both | Either

/**
 * @category model
 * @since 1.0.0
 */
export interface Left {
  readonly _tag: "Left"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Right {
  readonly _tag: "Right"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Both {
  readonly _tag: "Both"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Either {
  readonly _tag: "Either"
}

/**
 * @tsplus type effect/core/stream/Stream/TerminationStrategy.Ops
 * @category model
 * @since 1.0.0
 */
export interface TerminationStrategyOps {}
export const TerminationStrategy: TerminationStrategyOps = {}

/**
 * @tsplus static effect/core/stream/Stream/TerminationStrategy.Ops Left
 * @category constructors
 * @since 1.0.0
 */
export const left: TerminationStrategy = {
  _tag: "Left"
}

/**
 * @tsplus static effect/core/stream/Stream/TerminationStrategy.Ops Right
 * @category constructors
 * @since 1.0.0
 */
export const right: TerminationStrategy = {
  _tag: "Right"
}

/**
 * @tsplus static effect/core/stream/Stream/TerminationStrategy.Ops Both
 * @category constructors
 * @since 1.0.0
 */
export const both: TerminationStrategy = {
  _tag: "Both"
}

/**
 * @tsplus static effect/core/stream/Stream/TerminationStrategy.Ops Either
 * @category constructors
 * @since 1.0.0
 */
export const either: TerminationStrategy = {
  _tag: "Either"
}
