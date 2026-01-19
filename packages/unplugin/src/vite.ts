/**
 * Vite plugin export for @effect/unplugin.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import effectPlugin from "@effect/unplugin/vite"
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
 * Vite plugin for Effect transformations.
 *
 * @since 0.1.0
 */
export default unplugin.vite

export type { EffectPluginOptions }
