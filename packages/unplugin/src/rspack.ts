/**
 * Rspack plugin export for @effect/unplugin.
 *
 * @example
 * ```typescript
 * // rspack.config.js
 * const effectPlugin = require("@effect/unplugin/rspack").default
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
 * Rspack plugin for Effect transformations.
 *
 * @since 0.1.0
 */
export default unplugin.rspack

export type { EffectPluginOptions }
