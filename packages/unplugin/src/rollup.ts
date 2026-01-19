/**
 * Rollup plugin export for @effect/unplugin.
 *
 * @example
 * ```typescript
 * // rollup.config.js
 * import effectPlugin from "@effect/unplugin/rollup"
 *
 * export default {
 *   plugins: [
 *     effectPlugin({
 *       sourceTrace: true
 *     })
 *   ]
 * }
 * ```
 *
 * @since 0.1.0
 */
import { type EffectPluginOptions, unplugin } from "./index.js"

/**
 * Rollup plugin for Effect transformations.
 *
 * @since 0.1.0
 */
export default unplugin.rollup

export type { EffectPluginOptions }
