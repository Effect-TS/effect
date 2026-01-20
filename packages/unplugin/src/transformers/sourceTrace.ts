/**
 * Source location trace transformer.
 *
 * This transformer injects source location metadata into Effect.gen yield expressions.
 * It supports both patterns:
 * - Legacy adapter: `yield* _(effect)` → `yield* _(effect, trace)`
 * - Modern pattern: `yield* effect` → `yield* $_adapter(effect, trace)`
 *
 * For the modern pattern, the transformer adds an adapter parameter to the generator
 * function if not present, since Effect.gen always passes the adapter at runtime.
 *
 * @since 0.1.0
 */
import type { NodePath, Visitor } from "@babel/traverse"
import * as t from "@babel/types"
import {
  getEffectGenGenerator,
  isEffectGenCall,
  isModernYield,
  isYieldAdapterCallWithName
} from "../utils/effectDetection.js"
import {
  createHoistingState,
  extractLabelFromParent,
  getOrCreateTraceIdentifier,
  type HoistingState
} from "../utils/hoisting.js"

/**
 * Options for the source trace transformer.
 */
export interface SourceTraceOptions {
  /**
   * Filter function to determine if a file should be transformed.
   * Defaults to transforming all .ts and .tsx files.
   */
  readonly filter?: (filename: string) => boolean
}

/**
 * State passed through the transformer.
 */
interface TransformState {
  filename: string
  hoisting: HoistingState
  /**
   * Map from generator function to its adapter parameter name.
   * Used to track which generators have been processed and their adapter names.
   */
  generatorAdapters: Map<unknown, string>
}

/**
 * Default adapter name to use when adding one to modern pattern generators.
 */
const INJECTED_ADAPTER_NAME = "$"

/**
 * Gets the adapter parameter name from a generator function, or null if none.
 */
function getAdapterParamName(
  gen: t.FunctionExpression | t.ArrowFunctionExpression
): string | null {
  if (gen.params.length === 0) return null
  const firstParam = gen.params[0]
  if (t.isIdentifier(firstParam)) {
    return firstParam.name
  }
  return null
}

/**
 * Creates a Babel visitor that injects source trace metadata into Effect.gen yields.
 */
export function createSourceTraceVisitor(
  filename: string,
  _options?: SourceTraceOptions
): Visitor<TransformState> {
  return {
    Program: {
      enter(_path, state) {
        state.filename = filename
        state.hoisting = createHoistingState()
        state.generatorAdapters = new Map()
      },
      exit(path, state) {
        // Prepend all hoisted statements to the program body
        if (state.hoisting.statements.length > 0) {
          path.unshiftContainer("body", state.hoisting.statements)
        }
      }
    },

    // Process Effect.gen calls to detect and optionally add adapter parameters
    CallExpression(path: NodePath<t.CallExpression>, state) {
      const node = path.node

      if (!isEffectGenCall(node)) return

      const generator = getEffectGenGenerator(node)
      if (!generator) return

      // Check if generator already has an adapter parameter
      const existingAdapter = getAdapterParamName(generator)

      if (existingAdapter) {
        // Generator uses legacy adapter pattern - store the name
        state.generatorAdapters.set(generator, existingAdapter)
      } else {
        // Modern pattern - add adapter parameter
        generator.params.unshift(t.identifier(INJECTED_ADAPTER_NAME))
        state.generatorAdapters.set(generator, INJECTED_ADAPTER_NAME)
      }
    },

    YieldExpression(path: NodePath<t.YieldExpression>, state) {
      const node = path.node

      // Must be yield* (delegating)
      if (!node.delegate || !node.argument) return

      // Find the enclosing generator function
      let generatorPath = path.getFunctionParent()
      if (!generatorPath) return

      const generatorNode = generatorPath.node as t.FunctionExpression | t.ArrowFunctionExpression
      if (!("generator" in generatorNode) || !generatorNode.generator) return

      // Get the adapter name for this generator
      const adapterName = state.generatorAdapters.get(generatorNode)
      if (!adapterName) {
        // Not inside an Effect.gen - skip
        return
      }

      // Get source location
      const loc = node.loc
      if (!loc) return

      // Extract label from parent (e.g., `const user = yield* ...`)
      const label = extractLabelFromParent(path)

      // Get or create hoisted trace identifier
      const traceId = getOrCreateTraceIdentifier(
        state.hoisting,
        state.filename,
        loc.start.line,
        loc.start.column,
        label
      )

      // Check if this is already an adapter call
      if (
        t.isCallExpression(node.argument) &&
        isYieldAdapterCallWithName(node, adapterName)
      ) {
        // Legacy pattern: _(effect) -> _(effect, trace)
        const callExpr = node.argument
        callExpr.arguments.push(t.cloneNode(traceId))
      } else if (isModernYield(node)) {
        // Modern pattern: effect -> $(effect, trace)
        const originalArg = node.argument
        const wrappedCall = t.callExpression(
          t.identifier(adapterName),
          [originalArg, t.cloneNode(traceId)]
        )
        node.argument = wrappedCall
      }
    }
  }
}

/**
 * Creates the source trace transformer plugin.
 */
export function sourceTraceTransformer(options?: SourceTraceOptions): {
  visitor: Visitor<TransformState>
  name: string
} {
  return {
    name: "effect-source-trace",
    visitor: createSourceTraceVisitor("", options)
  }
}
