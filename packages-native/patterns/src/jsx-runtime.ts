/**
 * @since 0.0.0
 */
import * as internal from "./internal/jsx.js"

/**
 * JSX Fragment symbol for `@jsxImportSource @effect-native/patterns`
 *
 * @since 0.0.0
 */
export const Fragment = internal.Fragment

/**
 * JSX factory for single child trees.
 *
 * @since 0.0.0
 */
export const jsx = internal.jsx

/**
 * JSX factory for multiple child trees.
 *
 * @since 0.0.0
 */
export const jsxs = internal.jsxs

/**
 * JSX element representation returned by the `jsx` helpers.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxElement = internal.JsxElement

/**
 * The key associated with a JSX element when reconciling collections.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxKey = internal.JsxKey

/**
 * Props record accepted by JSX elements.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxProps = internal.JsxProps

/**
 * Reference value attached to JSX elements.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxRef = internal.JsxRef

/**
 * Ambient JSX namespace mapping tags to props for this runtime.
 *
 * @since 0.0.0
 */
export namespace JSX {
  /**
   * Intrinsic element map enabling arbitrary tag names.
   *
   * @since 0.0.0
   */
  export interface IntrinsicElements {
    [anything: string]: internal.JsxProps
  }
  interface ExoticComponent {
    readonly $$typeof: symbol
  }

  /**
   * JSX element type surfaced to consumers.
   *
   * @since 0.0.0
   */
  export type Element = internal.JsxElement | ExoticComponent | any
}
