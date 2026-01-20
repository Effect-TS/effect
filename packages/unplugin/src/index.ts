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
import type { GeneratorResult } from "@babel/generator"
import _generate from "@babel/generator"
import { parse } from "@babel/parser"
import type { Scope, TraverseOptions, Visitor } from "@babel/traverse"
import _traverse from "@babel/traverse"
import type { Node } from "@babel/types"
import { createUnplugin, type UnpluginFactory, type UnpluginInstance } from "unplugin"
import { createAnnotateEffectsVisitor } from "./transformers/annotateEffects.js"
import { createSourceTraceVisitor } from "./transformers/sourceTrace.js"
import { createWithSpanTraceVisitor } from "./transformers/withSpanTrace.js"
import type { HoistingState } from "./utils/hoisting.js"

// Define function types for Babel packages (they export differently in ESM vs CJS)
type TraverseFn = <S>(
  parent: Node,
  opts: TraverseOptions<S>,
  scope: Scope | undefined,
  state: S
) => void

type GenerateFn = (
  ast: Node,
  opts?: { sourceMaps?: boolean; sourceFileName?: string },
  code?: string
) => GeneratorResult

// Handle both ESM and CJS module exports for Babel packages
const traverse: TraverseFn = typeof _traverse === "function"
  ? _traverse as TraverseFn
  : (_traverse as unknown as { default: TraverseFn }).default

const generate: GenerateFn = typeof _generate === "function"
  ? _generate as GenerateFn
  : (_generate as unknown as { default: GenerateFn }).default

/**
 * Internal state used by transformers during AST traversal.
 */
interface TransformState {
  filename: string
  hoisting: HoistingState
  /**
   * Map from generator function to its adapter parameter name.
   * Used by source trace transformer to track Effect.gen generators.
   */
  generatorAdapters: Map<unknown, string>
}

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
   * Enable source location attributes injection into Effect.withSpan() calls.
   * When enabled, spans will include code.filepath, code.lineno, and code.column attributes.
   *
   * @default true
   */
  readonly spanTrace?: boolean

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
    annotateEffects = false,
    exclude = DEFAULT_EXCLUDE,
    include = DEFAULT_INCLUDE,
    sourceTrace = true,
    spanTrace = true
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
      const visitors: Array<Visitor<TransformState>> = []

      if (sourceTrace) {
        visitors.push(createSourceTraceVisitor(id))
      }

      if (spanTrace) {
        visitors.push(createWithSpanTraceVisitor(id))
      }

      // Run annotateEffects separately (it has a simpler state)
      if (annotateEffects) {
        const annotateState = { filename: id }
        traverse(ast, createAnnotateEffectsVisitor(id), undefined, annotateState)
      }

      // Combine visitors
      if (visitors.length === 0 && !annotateEffects) {
        return null
      }

      // Initialize state for each visitor
      const states = visitors.map(() => ({
        filename: id,
        hoisting: {
          hoistedTraces: new Map(),
          counter: 0,
          statements: []
        },
        generatorAdapters: new Map()
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
