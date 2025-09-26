/**
 * @since 0.0.0
 */
import * as internal from "./internal/jsx.js"

/**
 * JSX Fragment symbol for dev builds.
 *
 * @since 0.0.0
 */
export const Fragment = internal.Fragment

/**
 * JSX factory with source metadata for dev builds.
 *
 * @since 0.0.0
 */
export const jsxDEV = internal.jsxDEV

/**
 * JSX element representation including dev metadata.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxElement = internal.JsxElement

/**
 * Key associated with JSX elements when reconciling lists in dev builds.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxKey = internal.JsxKey

/**
 * Props record accepted by JSX factories in dev builds.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxProps = internal.JsxProps

/**
 * Ref value captured by JSX element creation in dev builds.
 *
 * @since 0.0.0
 * @category models
 */
export type JsxRef = internal.JsxRef
