/**
 * Pure call annotation transformer.
 *
 * This transformer adds `#__PURE__` comments to call expressions for better tree-shaking.
 * It replicates the behavior of `babel-plugin-annotate-pure-calls` but integrated into
 * the Effect unplugin.
 *
 * The `#__PURE__` annotation tells bundlers (Webpack, Rollup, esbuild) that a function call
 * has no side effects and can be safely removed if the result is unused.
 *
 * @since 0.1.0
 */
import type { NodePath, Visitor } from "@babel/traverse"
import * as t from "@babel/types"

/**
 * Options for the annotate effects transformer.
 */
export interface AnnotateEffectsOptions {
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
}

const PURE_ANNOTATION = "#__PURE__"

/**
 * Checks if a node already has a PURE annotation.
 */
function isPureAnnotated(node: t.Node): boolean {
  const leadingComments = node.leadingComments
  if (!leadingComments) {
    return false
  }
  return leadingComments.some((comment) => /[@#]__PURE__/.test(comment.value))
}

/**
 * Adds a PURE annotation comment to a node.
 */
function annotateAsPure(path: NodePath<t.CallExpression | t.NewExpression>): void {
  if (isPureAnnotated(path.node)) {
    return
  }
  path.addComment("leading", PURE_ANNOTATION)
}

/**
 * Checks if the parent is a CallExpression or NewExpression.
 */
function hasCallableParent(path: NodePath): boolean {
  const parentPath = path.parentPath
  if (!parentPath) return false
  return parentPath.isCallExpression() || parentPath.isNewExpression()
}

/**
 * Checks if this node is used as a callee (e.g., `foo()` where foo is the callee).
 */
function isUsedAsCallee(path: NodePath): boolean {
  if (!hasCallableParent(path)) {
    return false
  }
  const parentPath = path.parentPath as NodePath<t.CallExpression | t.NewExpression>
  return parentPath.get("callee") === path
}

/**
 * Checks if this node is inside a callee chain (e.g., `foo()()` or `foo.bar()`).
 */
function isInCallee(path: NodePath): boolean {
  let current: NodePath | null = path
  do {
    current = current.parentPath
    if (!current) return false
    if (isUsedAsCallee(current)) {
      return true
    }
  } while (!current.isStatement() && !current.isFunction())
  return false
}

/**
 * Checks if this expression is executed during module initialization
 * (not inside a function that isn't immediately invoked).
 */
function isExecutedDuringInitialization(path: NodePath): boolean {
  let functionParent = path.getFunctionParent()
  while (functionParent) {
    if (!isUsedAsCallee(functionParent)) {
      return false
    }
    functionParent = functionParent.getFunctionParent()
  }
  return true
}

/**
 * Checks if this expression is in an assignment context
 * (variable declaration, assignment expression, or class).
 */
function isInAssignmentContext(path: NodePath): boolean {
  const statement = path.getStatementParent()
  if (!statement) return false

  let currentPath: NodePath | null = path
  do {
    currentPath = currentPath.parentPath
    if (!currentPath) return false

    if (
      currentPath.isVariableDeclaration() ||
      currentPath.isAssignmentExpression() ||
      currentPath.isClass()
    ) {
      return true
    }
  } while (currentPath !== statement)

  return false
}

/**
 * Visitor function for CallExpression and NewExpression nodes.
 */
function callableExpressionVisitor(
  path: NodePath<t.CallExpression | t.NewExpression>,
  _state: TransformState
): void {
  // Skip if this is used as a callee (e.g., foo()())
  if (isUsedAsCallee(path)) {
    return
  }

  // Skip if this is inside a callee chain
  if (isInCallee(path)) {
    return
  }

  // Skip if not executed during initialization
  if (!isExecutedDuringInitialization(path)) {
    return
  }

  // Must be in assignment context or export default
  const statement = path.getStatementParent()
  if (!isInAssignmentContext(path) && !statement?.isExportDefaultDeclaration()) {
    return
  }

  annotateAsPure(path)
}

/**
 * Creates a Babel visitor that adds PURE annotations to call expressions.
 */
export function createAnnotateEffectsVisitor(
  filename: string,
  _options?: AnnotateEffectsOptions
): Visitor<TransformState> {
  return {
    Program: {
      enter(_path, state) {
        state.filename = filename
      }
    },

    CallExpression(path: NodePath<t.CallExpression>, state) {
      callableExpressionVisitor(path, state)
    },

    NewExpression(path: NodePath<t.NewExpression>, state) {
      callableExpressionVisitor(path, state)
    }
  }
}

/**
 * Creates the annotate effects transformer plugin.
 */
export function annotateEffectsTransformer(options?: AnnotateEffectsOptions): {
  visitor: Visitor<TransformState>
  name: string
} {
  return {
    name: "effect-annotate-pure-calls",
    visitor: createAnnotateEffectsVisitor("", options)
  }
}
