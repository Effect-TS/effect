/**
 * @effect/unplugin - Universal bundler plugin for Effect transformations.
 *
 * This plugin provides build-time transformations for Effect code:
 * - Source trace injection for automatic log prefixing and debugging
 * - Pure call annotations for tree-shaking optimization
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
import _generate from "@babel/generator"
import { parse } from "@babel/parser"
import _traverse, { type Visitor } from "@babel/traverse"
import { createUnplugin, type UnpluginFactory, type UnpluginInstance } from "unplugin"
import { createSourceTraceVisitor } from "./transformers/sourceTrace.js"

// Handle both ESM and CJS module exports
const traverse = typeof _traverse === "function" ? _traverse : (_traverse as any).default
const generate = typeof _generate === "function" ? _generate : (_generate as any).default

/**
 * Configuration options for the Effect plugin.
 *
 * @since 0.1.0
 */
export interface EffectPluginOptions {
  /**
   * Enable source trace injection into Effect.gen yields.
   * When enabled, logs will automatically include source locations.
   *
   * @default true
   */
  readonly sourceTrace?: boolean

  /**
   * Enable @__PURE__ annotations for tree-shaking.
   *
   * @default false
   */
  readonly annotateEffects?: boolean

  /**
   * Glob patterns to include in transformation.
   *
   * @default ["**\/*.ts", "**\/*.tsx"]
   */
  readonly include?: ReadonlyArray<string>

  /**
   * Glob patterns to exclude from transformation.
   *
   * @default ["**\/node_modules/**", "**\/*.d.ts"]
   */
  readonly exclude?: ReadonlyArray<string>
}

/**
 * Default file patterns to include.
 */
const DEFAULT_INCLUDE = [/\.[jt]sx?$/]

/**
 * Default file patterns to exclude.
 */
const DEFAULT_EXCLUDE = [/node_modules/, /\.d\.ts$/]

/**
 * Checks if a file should be transformed based on include/exclude patterns.
 */
function shouldTransform(
  id: string,
  include: ReadonlyArray<string | RegExp>,
  exclude: ReadonlyArray<string | RegExp>
): boolean {
  // Check excludes first
  for (const pattern of exclude) {
    if (typeof pattern === "string") {
      if (id.includes(pattern)) return false
    } else if (pattern.test(id)) {
      return false
    }
  }

  // Check includes
  for (const pattern of include) {
    if (typeof pattern === "string") {
      if (id.includes(pattern)) return true
    } else if (pattern.test(id)) {
      return true
    }
  }

  return false
}

/**
 * Creates the unplugin factory.
 */
const unpluginFactory: UnpluginFactory<EffectPluginOptions | undefined> = (options = {}) => {
  const {
    annotateEffects: _annotateEffects = false,
    exclude = DEFAULT_EXCLUDE,
    include = DEFAULT_INCLUDE,
    sourceTrace = true
  } = options

  return {
    name: "@effect/unplugin",

    transformInclude(id) {
      return shouldTransform(id, include as Array<string | RegExp>, exclude as Array<string | RegExp>)
    },

    transform(code, id) {
      // Parse the source code
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"]
      })

      // Collect visitors
      const visitors: Array<Visitor<any>> = []

      if (sourceTrace) {
        visitors.push(createSourceTraceVisitor(id))
      }

      // Combine visitors
      if (visitors.length === 0) {
        return null
      }

      // Initialize state for each visitor
      const states = visitors.map(() => ({
        filename: id,
        hoisting: {
          hoistedTraces: new Map(),
          counter: 0,
          statements: []
        }
      }))

      // Run each visitor
      for (let i = 0; i < visitors.length; i++) {
        traverse(ast, visitors[i], undefined, states[i])
      }

      // Generate output
      const output = generate(ast, {
        sourceMaps: true,
        sourceFileName: id
      }, code)

      return {
        code: output.code,
        map: output.map
      }
    }
  }
}

/**
 * The unplugin instance.
 *
 * @since 0.1.0
 */
export const unplugin: UnpluginInstance<EffectPluginOptions | undefined, boolean> = createUnplugin(unpluginFactory)

/**
 * Default export for convenience.
 *
 * @since 0.1.0
 */
export default unplugin
