/**
 * Minimal ESTree scope analysis for the service shaking analysis.
 *
 * Resolves every identifier reference in value positions to the binding that
 * declares it, records writes, and keeps a parent map so references can be
 * classified by the syntax around them. TypeScript-only syntax is skipped.
 *
 * @internal
 */

/** @internal */
export interface Node {
  readonly type: string
  readonly start: number
  readonly end: number
  readonly [key: string]: any
}

/** @internal */
export type BindingKind =
  | "import"
  | "var"
  | "let"
  | "const"
  | "using"
  | "function"
  | "class"
  | "param"
  | "catch"
  | "enum"

/** @internal */
export interface Reference {
  readonly node: Node
  readonly write: boolean
}

/** @internal */
export interface Binding {
  readonly name: string
  readonly kind: BindingKind
  readonly scope: Scope
  /** The declaring node: a VariableDeclarator, function, class, import specifier, or the parameter pattern root. */
  readonly declaration: Node
  readonly refs: Array<Reference>
}

/** @internal */
export interface Scope {
  readonly node: Node
  readonly parent: Scope | undefined
  readonly bindings: Map<string, Binding>
  readonly isFunction: boolean
}

/** @internal */
export interface ModuleScope {
  readonly program: Node
  readonly scope: Scope
  readonly parents: Map<Node, Node>
  readonly resolved: Map<Node, Binding>
  /** Binding identifier nodes to the binding they declare. */
  readonly declared: Map<Node, Binding>
  /** References to names that are not declared in the module. */
  readonly globals: Array<Node>
}

const skippedKeys = new Set([
  "typeAnnotation",
  "returnType",
  "typeParameters",
  "typeArguments",
  "superTypeArguments",
  "superTypeParameters",
  "implements"
])

const valueTsNodes = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "TSParameterProperty",
  "TSExportAssignment",
  "TSEnumDeclaration",
  "TSEnumBody",
  "TSEnumMember"
])

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as Node).type === "string"

const isSkipped = (node: Node): boolean =>
  node.declare === true || (node.type.startsWith("TS") && !valueTsNodes.has(node.type)) ||
  node.importKind === "type" || node.exportKind === "type"

/** @internal */
export const children = (node: Node): Array<Node> => {
  const out: Array<Node> = []
  for (const key in node) {
    if (skippedKeys.has(key)) continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item) && !isSkipped(item)) out.push(item)
      }
    } else if (isNode(value) && !isSkipped(value)) {
      out.push(value)
    }
  }
  return out
}

/** @internal */
export const isFunctionNode = (node: Node): boolean =>
  node.type === "FunctionDeclaration" || node.type === "FunctionExpression" ||
  node.type === "ArrowFunctionExpression"

const patternNames = (pattern: Node, out: Array<Node>): Array<Node> => {
  switch (pattern.type) {
    case "Identifier":
      out.push(pattern)
      break
    case "ObjectPattern":
      for (const property of pattern.properties) {
        patternNames(property.type === "RestElement" ? property.argument : property.value, out)
      }
      break
    case "ArrayPattern":
      for (const element of pattern.elements) {
        if (element) patternNames(element, out)
      }
      break
    case "AssignmentPattern":
      patternNames(pattern.left, out)
      break
    case "RestElement":
      patternNames(pattern.argument, out)
      break
    case "TSParameterProperty":
      patternNames(pattern.parameter, out)
      break
  }
  return out
}

/** @internal */
export const analyzeScopes = (program: Node): ModuleScope => {
  const parents = new Map<Node, Node>()
  const resolved = new Map<Node, Binding>()
  const declared = new Map<Node, Binding>()
  const globals: Array<Node> = []

  const setParents = (node: Node) => {
    for (const child of children(node)) {
      parents.set(child, node)
      setParents(child)
    }
  }
  setParents(program)

  const makeScope = (node: Node, parent: Scope | undefined, isFunction: boolean): Scope => ({
    node,
    parent,
    bindings: new Map(),
    isFunction
  })

  const declare = (scope: Scope, id: Node, kind: BindingKind, declaration: Node) => {
    let binding = scope.bindings.get(id.name)
    if (binding === undefined) {
      binding = { name: id.name, kind, scope, declaration, refs: [] }
      scope.bindings.set(id.name, binding)
    }
    declared.set(id, binding)
  }

  const declarePattern = (scope: Scope, pattern: Node, kind: BindingKind, declaration: Node) => {
    for (const id of patternNames(pattern, [])) declare(scope, id, kind, declaration)
  }

  const hoistStatements = (scope: Scope, statements: ReadonlyArray<Node>) => {
    for (let statement of statements) {
      if (
        (statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration") &&
        statement.declaration
      ) {
        statement = statement.declaration
      }
      if (isSkipped(statement)) continue
      switch (statement.type) {
        case "ImportDeclaration":
          for (const specifier of statement.specifiers ?? []) {
            if (specifier.importKind !== "type") declare(scope, specifier.local, "import", specifier)
          }
          break
        case "VariableDeclaration":
          if (statement.kind !== "var") {
            for (const declarator of statement.declarations) {
              declarePattern(scope, declarator.id, statement.kind === "const" ? "const" : statement.kind, declarator)
            }
          }
          break
        case "FunctionDeclaration":
        case "ClassDeclaration":
          if (statement.id) {
            declare(scope, statement.id, statement.type === "ClassDeclaration" ? "class" : "function", statement)
          }
          break
        case "TSEnumDeclaration":
          declare(scope, statement.id, "enum", statement)
          break
      }
    }
  }

  const hoistVars = (scope: Scope, node: Node) => {
    for (const child of children(node)) {
      if (isFunctionNode(child) || child.type === "ClassDeclaration" || child.type === "ClassExpression") continue
      if (child.type === "VariableDeclaration" && child.kind === "var") {
        for (const declarator of child.declarations) declarePattern(scope, declarator.id, "var", declarator)
      }
      hoistVars(scope, child)
    }
  }

  const reference = (node: Node, scope: Scope, write: boolean) => {
    for (let current: Scope | undefined = scope; current; current = current.parent) {
      const binding = current.bindings.get(node.name)
      if (binding) {
        binding.refs.push({ node, write })
        resolved.set(node, binding)
        return
      }
    }
    globals.push(node)
  }

  const visitPattern = (pattern: Node, scope: Scope, assign: boolean): void => {
    switch (pattern.type) {
      case "Identifier":
        if (assign) reference(pattern, scope, true)
        return
      case "ObjectPattern":
        for (const property of pattern.properties) {
          if (property.type === "RestElement") {
            visitPattern(property.argument, scope, assign)
          } else {
            if (property.computed) visit(property.key, scope)
            visitPattern(property.value, scope, assign)
          }
        }
        return
      case "ArrayPattern":
        for (const element of pattern.elements) {
          if (element) visitPattern(element, scope, assign)
        }
        return
      case "AssignmentPattern":
        visitPattern(pattern.left, scope, assign)
        visit(pattern.right, scope)
        return
      case "RestElement":
        visitPattern(pattern.argument, scope, assign)
        return
      case "TSParameterProperty":
        visitPattern(pattern.parameter, scope, assign)
        return
      default:
        visit(pattern, scope)
    }
  }

  const visitFunction = (node: Node, scope: Scope) => {
    const fnScope = makeScope(node, scope, true)
    if (node.type === "FunctionExpression" && node.id) declare(fnScope, node.id, "function", node)
    for (const param of node.params) declarePattern(fnScope, param, "param", param)
    for (const param of node.params) visitPattern(param, fnScope, false)
    const body = node.body
    if (!body) return
    if (body.type === "BlockStatement") {
      hoistStatements(fnScope, body.body)
      hoistVars(fnScope, body)
      for (const statement of body.body) visit(statement, fnScope)
    } else {
      visit(body, fnScope)
    }
  }

  const visitBlock = (node: Node, statements: ReadonlyArray<Node>, scope: Scope) => {
    const blockScope = makeScope(node, scope, false)
    hoistStatements(blockScope, statements)
    for (const child of children(node)) visit(child, blockScope)
  }

  const visit = (node: Node, scope: Scope): void => {
    if (isSkipped(node)) return
    switch (node.type) {
      case "Identifier":
        reference(node, scope, false)
        return
      case "ImportDeclaration":
      case "ExportAllDeclaration":
      case "MetaProperty":
      case "BreakStatement":
      case "ContinueStatement":
      case "Super":
      case "ThisExpression":
        return
      case "ExportNamedDeclaration":
        if (node.declaration) visit(node.declaration, scope)
        return
      case "LabeledStatement":
        visit(node.body, scope)
        return
      case "MemberExpression":
        visit(node.object, scope)
        if (node.computed) visit(node.property, scope)
        return
      case "Property":
      case "MethodDefinition":
      case "PropertyDefinition":
      case "AccessorProperty":
        for (const decorator of node.decorators ?? []) visit(decorator, scope)
        if (node.computed) visit(node.key, scope)
        if (node.value) visit(node.value, scope)
        return
      case "VariableDeclaration":
        for (const declarator of node.declarations) {
          visitPattern(declarator.id, scope, false)
          if (declarator.init) visit(declarator.init, scope)
        }
        return
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        visitFunction(node, scope)
        return
      case "ClassDeclaration":
      case "ClassExpression": {
        for (const decorator of node.decorators ?? []) visit(decorator, scope)
        if (node.superClass) visit(node.superClass, scope)
        const classScope = makeScope(node, scope, false)
        if (node.type === "ClassExpression" && node.id) declare(classScope, node.id, "class", node)
        visit(node.body, classScope)
        return
      }
      case "BlockStatement":
      case "StaticBlock":
        visitBlock(node, node.body, scope)
        return
      case "SwitchStatement": {
        visit(node.discriminant, scope)
        const switchScope = makeScope(node, scope, false)
        hoistStatements(switchScope, node.cases.flatMap((c: Node) => c.consequent))
        for (const c of node.cases) visit(c, switchScope)
        return
      }
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement": {
        const loopScope = makeScope(node, scope, false)
        const head = node.type === "ForStatement" ? node.init : node.left
        if (head?.type === "VariableDeclaration" && head.kind !== "var") {
          for (const declarator of head.declarations) {
            declarePattern(loopScope, declarator.id, head.kind === "const" ? "const" : head.kind, declarator)
          }
        }
        if (head && head.type !== "VariableDeclaration" && node.type !== "ForStatement") {
          visitPattern(head, loopScope, true)
        } else if (head) {
          visit(head, loopScope)
        }
        for (const key of ["test", "update", "right", "body"]) {
          if (node[key]) visit(node[key], loopScope)
        }
        return
      }
      case "CatchClause": {
        const catchScope = makeScope(node, scope, false)
        if (node.param) {
          declarePattern(catchScope, node.param, "catch", node.param)
          visitPattern(node.param, catchScope, false)
        }
        visit(node.body, catchScope)
        return
      }
      case "AssignmentExpression":
        visitPattern(node.left, scope, true)
        visit(node.right, scope)
        return
      case "UpdateExpression":
        if (node.argument.type === "Identifier") reference(node.argument, scope, true)
        else visit(node.argument, scope)
        return
      default:
        for (const child of children(node)) visit(child, scope)
    }
  }

  const moduleScope = makeScope(program, undefined, true)
  hoistStatements(moduleScope, program.body)
  hoistVars(moduleScope, program)
  for (const statement of program.body) visit(statement, moduleScope)

  return { program, scope: moduleScope, parents, resolved, declared, globals }
}
