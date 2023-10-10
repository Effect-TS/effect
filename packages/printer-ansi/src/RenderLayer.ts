/**
 * @since 1.0.0
 */
import * as internal from "./internal/renderLayer"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type RenderLayer = Background | Foreground

/**
 * @since 1.0.0
 * @category model
 */
export interface Background {
  readonly _tag: "Background"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Foreground {
  readonly _tag: "Foreground"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const foreground: RenderLayer = internal.foreground

/**
 * @since 1.0.0
 * @category constructors
 */
export const background: RenderLayer = internal.background
