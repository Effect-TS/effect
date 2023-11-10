import * as internal from "../internal/stream/haltStrategy.js"
import type { StreamHaltStrategy } from "../StreamHaltStrategy.js"

/**
 * @since 2.0.0
 * @category models
 */
export type HaltStrategyInput = StreamHaltStrategy | "left" | "right" | "both" | "either"

/**
 * @since 2.0.0
 * @category models
 */
export interface Left {
  readonly _tag: "Left"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Right {
  readonly _tag: "Right"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Both {
  readonly _tag: "Both"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Either {
  readonly _tag: "Either"
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const Left: StreamHaltStrategy = internal.Left

/**
 * @since 2.0.0
 * @category constructors
 */
export const Right: StreamHaltStrategy = internal.Right

/**
 * @since 2.0.0
 * @category constructors
 */
export const Both: StreamHaltStrategy = internal.Both

/**
 * @since 2.0.0
 * @category constructors
 */
export const Either: StreamHaltStrategy = internal.Either

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromInput: (input: HaltStrategyInput) => StreamHaltStrategy = internal.fromInput

/**
 * @since 2.0.0
 * @category refinements
 */
export const isLeft: (self: StreamHaltStrategy) => self is Left = internal.isLeft

/**
 * @since 2.0.0
 * @category refinements
 */
export const isRight: (self: StreamHaltStrategy) => self is Right = internal.isRight

/**
 * @since 2.0.0
 * @category refinements
 */
export const isBoth: (self: StreamHaltStrategy) => self is Both = internal.isBoth

/**
 * @since 2.0.0
 * @category refinements
 */
export const isEither: (self: StreamHaltStrategy) => self is Either = internal.isEither

/**
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <Z>(onLeft: () => Z, onRight: () => Z, onBoth: () => Z, onEither: () => Z): (self: StreamHaltStrategy) => Z
  <Z>(self: StreamHaltStrategy, onLeft: () => Z, onRight: () => Z, onBoth: () => Z, onEither: () => Z): Z
} = internal.match
