/**
 * Utilities for detecting Effect patterns in AST nodes.
 *
 * @since 0.1.0
 */
import * as t from "@babel/types"

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

/**
 * Checks if a YieldExpression is a `yield* _(effect)` pattern with a specific adapter name.
 */
export function isYieldAdapterCallWithName(node: t.YieldExpression, adapterName: string): boolean {
  if (!node.delegate) return false // Must be yield*, not yield
  if (!node.argument) return false
  if (node.argument.type !== "CallExpression") return false
  const callee = node.argument.callee
  return callee.type === "Identifier" && callee.name === adapterName
}

/**
 * Checks if a YieldExpression is a modern `yield* effect` pattern (without adapter).
 * This is the pattern used when Effect.gen is called without the adapter parameter.
 */
export function isModernYield(node: t.YieldExpression): boolean {
  if (!node.delegate) return false // Must be yield*, not yield
  if (!node.argument) return false
  // Modern yields are NOT adapter calls - they yield the effect directly
  if (node.argument.type === "CallExpression" && isAdapterCall(node.argument)) {
    return false
  }
  return true
}

/**
 * Gets the generator function from an Effect.gen call.
 * Returns the FunctionExpression/ArrowFunctionExpression if found.
 */
export function getEffectGenGenerator(node: t.CallExpression): t.FunctionExpression | t.ArrowFunctionExpression | null {
  // Effect.gen can be called with 1 or 2 arguments:
  // Effect.gen(function*() { ... }) - 1 arg
  // Effect.gen(context, function*() { ... }) - 2 args
  const args = node.arguments

  for (let i = args.length - 1; i >= 0; i--) {
    const arg = args[i]
    if (t.isFunctionExpression(arg) && arg.generator) {
      return arg
    }
    if (t.isArrowFunctionExpression(arg) && arg.generator) {
      return arg
    }
  }

  return null
}
