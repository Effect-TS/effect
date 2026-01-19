/**
 * Webpack plugin export for @effect/unplugin.
 *
 * @example
 * ```typescript
 * // webpack.config.js
 * const effectPlugin = require("@effect/unplugin/webpack").default
 *
 * module.exports = {
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
 * Webpack plugin for Effect transformations.
 *
 * @since 0.1.0
 */
export default unplugin.webpack

export type { EffectPluginOptions }
