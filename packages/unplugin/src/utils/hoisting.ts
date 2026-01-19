/**
 * Utilities for hoisting trace metadata to module scope.
 *
 * @since 0.1.0
 */
import * as t from "@babel/types"

/**
 * State for tracking hoisted trace declarations.
 */
export interface HoistingState {
  /** Map from dedup key to hoisted identifier */
  readonly hoistedTraces: Map<string, t.Identifier>
  /** Counter for generating unique identifiers */
  counter: number
  /** Statements to prepend to the program body */
  readonly statements: Array<t.Statement>
}

/**
 * Creates a new hoisting state.
 */
export function createHoistingState(): HoistingState {
  return {
    hoistedTraces: new Map(),
    counter: 0,
    statements: []
  }
}

/**
 * Creates a unique deduplication key for a source location.
 * Uses line:column to disambiguate multiple yields on the same line.
 */
export function createDedupKey(
  filename: string,
  line: number,
  column: number
): string {
  return `${filename}:${line}:${column}`
}

/**
 * Gets or creates a hoisted trace identifier for the given source location.
 */
export function getOrCreateTraceIdentifier(
  state: HoistingState,
  filename: string,
  line: number,
  column: number,
  label?: string
): t.Identifier {
  const key = createDedupKey(filename, line, column)

  let identifier = state.hoistedTraces.get(key)
  if (identifier) {
    return identifier
  }

  // Create new identifier
  identifier = t.identifier(`_trace${state.counter++}`)
  state.hoistedTraces.set(key, identifier)

  // Create the SourceLocation object literal
  const properties: Array<t.ObjectProperty> = [
    t.objectProperty(
      t.identifier("_tag"),
      t.stringLiteral("SourceLocation")
    ),
    t.objectProperty(
      t.identifier("path"),
      t.stringLiteral(filename)
    ),
    t.objectProperty(
      t.identifier("line"),
      t.numericLiteral(line)
    ),
    t.objectProperty(
      t.identifier("column"),
      t.numericLiteral(column)
    )
  ]

  if (label) {
    properties.push(
      t.objectProperty(
        t.identifier("label"),
        t.stringLiteral(label)
      )
    )
  }

  // Wrap in Symbol.for call to add the type tag
  const traceObject = t.objectExpression([
    t.objectProperty(
      t.callExpression(
        t.memberExpression(t.identifier("Symbol"), t.identifier("for")),
        [t.stringLiteral("effect/SourceLocation")]
      ),
      t.callExpression(
        t.memberExpression(t.identifier("Symbol"), t.identifier("for")),
        [t.stringLiteral("effect/SourceLocation")]
      ),
      true // computed property
    ),
    ...properties
  ])

  // Create variable declaration
  const declaration = t.variableDeclaration("const", [
    t.variableDeclarator(identifier, traceObject)
  ])

  state.statements.push(declaration)

  return identifier
}

/**
 * Extracts a label from a VariableDeclarator if the yield is part of an assignment.
 * For example: `const user = yield* _(fetchUser(id))` extracts "user"
 */
export function extractLabelFromParent(path: {
  parent?: t.Node | null
  parentPath?: { node?: t.Node | null } | null
}): string | undefined {
  const parent = path.parent
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name
  }
  return undefined
}
