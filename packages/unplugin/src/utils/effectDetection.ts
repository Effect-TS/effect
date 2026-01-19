/**
 * Utilities for detecting Effect patterns in AST nodes.
 *
 * @since 0.1.0
 */
import type * as t from "@babel/types"

/**
 * Checks if a CallExpression is `Effect.gen(...)`.
 */
export function isEffectGenCall(node: t.Node): node is t.CallExpression {
  if (node.type !== "CallExpression") return false

  const callee = node.callee

  // Match Effect.gen(...)
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    callee.object.name === "Effect" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "gen"
  ) {
    return true
  }

  // Match _.gen(...) where _ is an alias for Effect
  if (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "gen"
  ) {
    return true
  }

  return false
}

/**
 * Minimal path-like interface for AST traversal.
 * This mirrors the essential properties of Babel's NodePath without importing the full type.
 */
interface PathLike {
  parent?: t.Node | null
  parentPath?: PathLike | null
}

/**
 * Checks if a node is inside an Effect.gen generator function.
 * This walks up the AST to find if there's an enclosing generator function
 * that is an argument to Effect.gen.
 */
export function isInsideEffectGen(path: PathLike): boolean {
  let current = path.parentPath
  while (current) {
    const node = current.parent as t.Node | undefined
    if (node && isEffectGenCall(node)) {
      return true
    }
    current = current.parentPath
  }
  return false
}

/**
 * Checks if a CallExpression is a call to the adapter function `_()`.
 * The adapter is the first argument passed to the generator function.
 */
export function isAdapterCall(node: t.CallExpression): boolean {
  return node.callee.type === "Identifier" && node.callee.name === "_"
}

/**
 * Checks if a YieldExpression is a `yield* _(effect)` pattern.
 */
export function isYieldAdapterCall(node: t.YieldExpression): boolean {
  if (!node.delegate) return false // Must be yield*, not yield
  if (!node.argument) return false
  if (node.argument.type !== "CallExpression") return false
  return isAdapterCall(node.argument)
}
