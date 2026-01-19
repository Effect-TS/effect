/**
 * Source location trace transformer.
 *
 * This transformer injects source location metadata into Effect.gen yield expressions.
 * It transforms `yield* _(effect)` into `yield* _(effect, trace)` where trace is a
 * hoisted SourceLocation object.
 *
 * @since 0.1.0
 */
import type { NodePath, Visitor } from "@babel/traverse"
import * as t from "@babel/types"
import { isYieldAdapterCall } from "../utils/effectDetection.js"
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
      },
      exit(path, state) {
        // Prepend all hoisted statements to the program body
        if (state.hoisting.statements.length > 0) {
          path.unshiftContainer("body", state.hoisting.statements)
        }
      }
    },

    YieldExpression(path: NodePath<t.YieldExpression>, state) {
      const node = path.node

      // Only transform yield* _(effect) patterns
      if (!isYieldAdapterCall(node)) {
        return
      }

      // Get source location
      const loc = node.loc
      if (!loc) return

      // Extract label from parent (e.g., `const user = yield* _(...)`)
      const label = extractLabelFromParent(path)

      // Get or create hoisted trace identifier
      const traceId = getOrCreateTraceIdentifier(
        state.hoisting,
        state.filename,
        loc.start.line,
        loc.start.column,
        label
      )

      // Inject trace as second argument: _(effect) -> _(effect, trace)
      const callExpr = node.argument as t.CallExpression
      callExpr.arguments.push(t.cloneNode(traceId))
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
