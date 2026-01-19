/**
 * WithSpan source location trace transformer.
 *
 * This transformer injects source location metadata as attributes into Effect.withSpan() calls.
 * It transforms `Effect.withSpan("name")` into `Effect.withSpan("name", { attributes: { "code.filepath": ..., "code.lineno": ... }})`.
 *
 * @since 0.1.0
 */
import type { NodePath, Visitor } from "@babel/traverse"
import * as t from "@babel/types"
import {
  createHoistingState,
  type HoistingState
} from "../utils/hoisting.js"

/**
 * Options for the withSpan trace transformer.
 */
export interface WithSpanTraceOptions {
  /**
   * Filter function to determine if a file should be transformed.
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
 * Checks if a CallExpression is a withSpan call.
 * Matches: Effect.withSpan(...), _.withSpan(...), or standalone withSpan(...)
 */
function isWithSpanCall(node: t.CallExpression): boolean {
  const callee = node.callee

  // Match Effect.withSpan(...) or _.withSpan(...)
  if (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "withSpan"
  ) {
    return true
  }

  // Match standalone withSpan(...)
  if (callee.type === "Identifier" && callee.name === "withSpan") {
    return true
  }

  return false
}

/**
 * Determines if this is a data-first call (effect as first arg) or data-last (name as first arg).
 * Data-first: withSpan(effect, "name", options?)
 * Data-last: withSpan("name", options?)
 */
function isDataFirstCall(node: t.CallExpression): boolean {
  // If first argument is a string literal, it's data-last
  if (node.arguments.length > 0 && t.isStringLiteral(node.arguments[0])) {
    return false
  }
  // If second argument exists and is a string literal, it's data-first
  if (node.arguments.length > 1 && t.isStringLiteral(node.arguments[1])) {
    return true
  }
  // Default to data-last pattern
  return false
}

/**
 * Creates the attributes object with source location.
 */
function createSourceAttributes(
  filepath: string,
  line: number,
  column: number
): t.ObjectExpression {
  return t.objectExpression([
    t.objectProperty(
      t.stringLiteral("code.filepath"),
      t.stringLiteral(filepath)
    ),
    t.objectProperty(
      t.stringLiteral("code.lineno"),
      t.numericLiteral(line)
    ),
    t.objectProperty(
      t.stringLiteral("code.column"),
      t.numericLiteral(column)
    )
  ])
}

/**
 * Merges source attributes into an existing options object or creates a new one.
 */
function mergeOrCreateOptions(
  existingOptions: t.Expression | t.SpreadElement | t.ArgumentPlaceholder | undefined,
  sourceAttrs: t.ObjectExpression
): t.ObjectExpression {
  if (!existingOptions || t.isSpreadElement(existingOptions) || t.isArgumentPlaceholder(existingOptions)) {
    // No existing options, create new object with attributes
    return t.objectExpression([
      t.objectProperty(t.identifier("attributes"), sourceAttrs)
    ])
  }

  if (t.isObjectExpression(existingOptions)) {
    // Check if there's an existing attributes property
    const existingAttrsIndex = existingOptions.properties.findIndex(
      (prop) =>
        t.isObjectProperty(prop) &&
        ((t.isIdentifier(prop.key) && prop.key.name === "attributes") ||
          (t.isStringLiteral(prop.key) && prop.key.value === "attributes"))
    )

    if (existingAttrsIndex >= 0) {
      // Merge with existing attributes using spread
      const existingAttrsProp = existingOptions.properties[existingAttrsIndex] as t.ObjectProperty
      const mergedAttrs = t.objectExpression([
        t.spreadElement(existingAttrsProp.value as t.Expression),
        ...sourceAttrs.properties
      ])

      // Clone the options and replace the attributes property
      const newProperties = [...existingOptions.properties]
      newProperties[existingAttrsIndex] = t.objectProperty(
        t.identifier("attributes"),
        mergedAttrs
      )
      return t.objectExpression(newProperties)
    } else {
      // Add new attributes property to existing object
      return t.objectExpression([
        ...existingOptions.properties,
        t.objectProperty(t.identifier("attributes"), sourceAttrs)
      ])
    }
  }

  // If it's a variable reference, spread it and add attributes
  return t.objectExpression([
    t.spreadElement(existingOptions),
    t.objectProperty(t.identifier("attributes"), sourceAttrs)
  ])
}

/**
 * Creates a Babel visitor that injects source location attributes into Effect.withSpan calls.
 */
export function createWithSpanTraceVisitor(
  filename: string,
  _options?: WithSpanTraceOptions
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

    CallExpression(path: NodePath<t.CallExpression>, state) {
      const node = path.node

      if (!isWithSpanCall(node)) {
        return
      }

      // Get source location
      const loc = node.loc
      if (!loc) return

      const line = loc.start.line
      const column = loc.start.column

      // Create source attributes
      const sourceAttrs = createSourceAttributes(state.filename, line, column)

      const isDataFirst = isDataFirstCall(node)

      if (isDataFirst) {
        // Data-first: withSpan(effect, "name", options?)
        // Options is at index 2
        const optionsArg = node.arguments[2]
        const newOptions = mergeOrCreateOptions(optionsArg, sourceAttrs)

        if (node.arguments.length >= 3) {
          // Replace existing options
          node.arguments[2] = newOptions
        } else {
          // Add options as third argument
          node.arguments.push(newOptions)
        }
      } else {
        // Data-last: withSpan("name", options?)
        // Options is at index 1
        const optionsArg = node.arguments[1]
        const newOptions = mergeOrCreateOptions(optionsArg, sourceAttrs)

        if (node.arguments.length >= 2) {
          // Replace existing options
          node.arguments[1] = newOptions
        } else {
          // Add options as second argument
          node.arguments.push(newOptions)
        }
      }
    }
  }
}

/**
 * Creates the withSpan trace transformer plugin.
 */
export function withSpanTraceTransformer(options?: WithSpanTraceOptions): {
  visitor: Visitor<TransformState>
  name: string
} {
  return {
    name: "effect-withspan-trace",
    visitor: createWithSpanTraceVisitor("", options)
  }
}
