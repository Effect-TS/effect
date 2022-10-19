/**
 * @since 1.0.0
 */

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/Layer
 */
export type Layer = Background | Foreground

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/Layer.Ops
 */
export interface LayerOps {}
/**
 * @category instances
 * @since 1.0.0
 */
export const Layer: LayerOps = {}

/**
 * @category model
 * @since 1.0.0
 */
export interface Background {
  readonly _tag: "Background"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Foreground {
  readonly _tag: "Foreground"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Layer.Ops Foreground
 */
export const Foreground: Layer = {
  _tag: "Foreground"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Layer.Ops Background
 */
export const Background: Layer = {
  _tag: "Background"
}
