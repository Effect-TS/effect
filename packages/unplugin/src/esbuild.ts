/**
 * esbuild plugin export for @effect/unplugin.
 *
 * @example
 * ```typescript
 * // build.js
 * import * as esbuild from "esbuild"
 * import effectPlugin from "@effect/unplugin/esbuild"
 *
 * await esbuild.build({
 *   plugins: [
 *     effectPlugin({
 *       sourceTrace: true
 *     })
 *   ]
 * })
 * ```
 *
 * @since 0.1.0
 */
import { type EffectPluginOptions, unplugin } from "./index.js"

/**
 * esbuild plugin for Effect transformations.
 *
 * @since 0.1.0
 */
export default unplugin.esbuild

export type { EffectPluginOptions }
