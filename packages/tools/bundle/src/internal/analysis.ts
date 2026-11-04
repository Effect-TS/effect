/**
 * Key-level demand analysis for Effect services.
 *
 * Demand is attached to the string key of a service, not to objects. Every
 * syntactic use of a service key must match a recognised consumer, provider
 * or neutral pattern, otherwise the key "bails" and keeps every method. Object
 * literals are only pruned when a bounded syntactic flow proves they reach a
 * Context solely through recognised insertion sites, every callback that sees
 * them is accounted for, and the Layer or Context holding them stays inside
 * the bundle.
 *
 * A whole Context, or a Fiber through its public `context`, lets code retrieve
 * any service by its key string, bypassing the key-level demand. Untrusted code
 * may therefore only reference audited trusted APIs, may not use reflection that reaches the global object or protocol
 * symbols, and the entry module may only export primitive constants. Anything
 * else disables pruning for the whole bundle.
 *
 * @internal
 */
import { analyzeScopes, type Binding, children, isFunctionNode, type ModuleScope, type Node } from "./scope.ts"

/** @internal */
export interface ModuleInput {
  readonly id: string
  readonly code: string
  readonly program: Node
  readonly comments: ReadonlyArray<{ readonly start: number; readonly end: number; readonly value: string }>
  /** Resolved module ids by import specifier. External or unresolved specifiers are absent. */
  readonly resolved: ReadonlyMap<string, string>
  readonly isEntry: boolean
  /** Whether the module is rendered in the unoptimized bundle. Only rendered modules can run. */
  readonly rendered: boolean
  /** Trusted modules may use Context and Fiber APIs internally (the compiler contract). */
  readonly trusted: boolean
  /** For trusted modules, the prefix of their exports in `allowedApis`, e.g. `Effect`. */
  readonly apiPrefix?: string | undefined
  /** Imports left external other than Node builtins, or that did not resolve. */
  readonly externalImports?: ReadonlyArray<string> | undefined
}

/** @internal */
export interface Edit {
  readonly start: number
  readonly end: number
}

/** @internal */
export interface Analysis {
  readonly edits: ReadonlyMap<string, ReadonlyArray<Edit>>
  /** Why the analysis gave up on everything, if it did. */
  readonly globalBailouts: ReadonlyArray<string>
  /** Why individual service keys keep every method. */
  readonly keyBailouts: ReadonlyMap<string, ReadonlyArray<string>>
  /** Demanded method names per service key, or "all". */
  readonly demand: ReadonlyMap<string, ReadonlyArray<string> | "all">
  /** Removed properties, as `module:key`. */
  readonly removed: ReadonlyArray<string>
}

interface Module {
  readonly input: ModuleInput
  readonly scope: ModuleScope
  readonly exports: Map<string, ExportTarget>
  readonly stars: Array<string>
}

type ExportTarget =
  | { readonly _tag: "Local"; readonly local: string }
  | { readonly _tag: "Reexport"; readonly source: string; readonly imported: string }
  | { readonly _tag: "Namespace"; readonly source: string }
  | { readonly _tag: "Expression" }

type Sym =
  | { readonly _tag: "Binding"; readonly module: Module; readonly binding: Binding }
  | { readonly _tag: "Namespace"; readonly module: Module }

interface Use {
  readonly module: Module
  readonly expr: Node
  readonly write: boolean
}

class Demand {
  all = false
  readonly names = new Set<string>()
  add(name: string): boolean {
    if (this.all || this.names.has(name)) return false
    this.names.add(name)
    return true
  }
  addAll(other: Demand, except?: ReadonlySet<string>): boolean {
    if (this.all) return false
    if (other.all) return this.setAll()
    let changed = false
    for (const name of other.names) {
      if (except === undefined || !except.has(name)) changed = this.add(name) || changed
    }
    return changed
  }
  setAll(): boolean {
    if (this.all) return false
    this.all = true
    return true
  }
  has(name: string): boolean {
    return this.all || this.names.has(name)
  }
}

interface LiteralInfo {
  readonly module: Module
  readonly node: Node
  readonly keys: Set<string>
  escaped: boolean
  readonly demand: Demand
  /** Argument links: this literal is passed for a parameter that is spread into `from`. */
  readonly links: Array<ParamSpread>
}

interface ParamSpread {
  readonly from: LiteralInfo
  readonly spread: Node
  readonly param: Binding
}

interface FunctionInfo {
  readonly module: Module
  readonly node: Node
  readonly binding: Binding | undefined
  readonly calls: Array<{ readonly module: Module; readonly call: Node }>
}

interface SpreadContribution {
  readonly key: string
  readonly module: Module
  readonly literal: Node
  readonly spread: Node
}

interface ValueSink {
  member(name: string): void
  spread(module: Module, literal: Node, spread: Node): void
  argument(module: Module, call: Node, index: number): boolean
  fail(reason: string): void
}

const wrapperTypes = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "ParenthesizedExpression"
])

const strip = (node: Node): Node => {
  while (wrapperTypes.has(node.type)) node = node.expression
  return node
}

const effectModulePattern = /[\\/]effect[\\/](?:src|dist)[\\/](.+)\.[cm]?[jt]s$/

const effectModuleName = (id: string): string | undefined => effectModulePattern.exec(id)?.[1]

const staticName = (node: Node, computed: boolean): string | undefined => {
  if (!computed && node.type === "Identifier") return node.name
  if (node.type === "Literal" && (typeof node.value === "string" || typeof node.value === "number")) {
    return String(node.value)
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked
  return undefined
}

const memberName = (node: Node): string | undefined => staticName(node.property, node.computed)

const retrievalApis = new Set(["Context.get", "Context.getUnsafe", "Context.getOrElse", "Context.getOrUndefined"])
const effectOps = new Set(["Effect.map", "Effect.flatMap", "Effect.andThen", "Effect.tap"])

// Trusted APIs that untrusted code may reference. A Fiber exposes its Context
// as a public property, and a Context hands out any service by key string
// (`Context.getUnsafe` with a rebuilt key, `mapUnsafe`, or plain traversal with
// `Object.values`), so any API that can hand either to the caller or to a
// callback must disable pruning. That set cannot be
// enumerated reliably: Fibers hide inside option and callback types such as
// `Logger.Options` or `RunOptions.onFiberStart`. Untrusted code is therefore
// limited to this audited list, and any other trusted API disables pruning.
// Each entry was checked to take no callback that receives a Fiber or Context
// and to return neither.
const allowedApis = new Set([
  "Effect.gen",
  "Effect.fn",
  "Effect.fnUntraced",
  "Effect.succeed",
  "Effect.sync",
  "Effect.fail",
  "Effect.die",
  "Effect.promise",
  "Effect.tryPromise",
  "Effect.suspend",
  "Effect.map",
  "Effect.flatMap",
  "Effect.andThen",
  "Effect.tap",
  "Effect.as",
  "Effect.asVoid",
  "Effect.all",
  "Effect.forEach",
  "Effect.catchTag",
  "Effect.catchTags",
  "Effect.orDie",
  "Effect.matchEffect",
  "Effect.match",
  // Takes a Context or Layer as input only.
  "Effect.provide",
  "Effect.provideService",
  "Effect.provideServiceEffect",
  "Effect.updateService",
  "Effect.service",
  "Effect.serviceOption",
  "Effect.scoped",
  "Effect.acquireRelease",
  "Effect.acquireUseRelease",
  "Effect.addFinalizer",
  "Effect.ensuring",
  "Effect.onExit",
  "Effect.log",
  "Effect.logInfo",
  "Effect.logDebug",
  "Effect.logWarning",
  "Effect.logError",
  "Effect.annotateLogs",
  "Effect.withLogSpan",
  "Effect.sleep",
  "Effect.yieldNow",
  // The register callback's `this` is the Scheduler, which exposes no Fiber.
  "Effect.callback",
  "Effect.exit",
  "Effect.when",
  "Effect.zip",
  "Effect.zipWith",
  "Effect.flatten",
  "Effect.isEffect",
  "Effect.ignore",
  "Effect.option",
  "Effect.result",
  "Effect.timeout",
  "Effect.delay",
  "Layer.succeed",
  "Layer.effect",
  "Layer.sync",
  "Layer.merge",
  "Layer.mergeAll",
  "Layer.provide",
  "Layer.provideMerge",
  "Layer.launch",
  "Layer.empty",
  "Layer.effectDiscard",
  "Context.get",
  "Context.getUnsafe",
  "Context.getOrElse",
  "Context.getOrUndefined",
  "Context.getOption",
  "Context.isContext",
  "FileSystem.make",
  "FileSystem.makeNoop",
  "FileSystem.layerNoop",
  "@effect/platform-node/NodeFileSystem.layer",
  "@effect/platform-node/NodeServices.layer",
  // The teardown callback receives an Exit, not a Fiber.
  "@effect/platform-node/NodeRuntime.runMain"
])
// Their `RunOptions` argument can install `onFiberStart`, so they are only
// allowed with the effect as the single argument.
const runApis = new Set(["Effect.runPromise", "Effect.runPromiseExit", "Effect.runSync", "Effect.runSyncExit"])
// Data modules whose declarations mention no Fiber, Context or Effect runtime type.
const allowedModules = new Set([
  "Option",
  "Array",
  "Order",
  "Equivalence",
  "Equal",
  "Hash",
  "Data",
  "Predicate",
  "String",
  "Number",
  "BigInt",
  "Boolean",
  "Struct",
  "Record",
  "Tuple",
  "Duration",
  "Chunk",
  "HashMap",
  "HashSet",
  "Result",
  "Redacted",
  "Brand",
  "Function",
  "Iterable",
  "Match"
])
// Globals that reach the global object or run code that can: the running
// Fiber, and so its Context, is published on the global object.
const reflectiveGlobals = new Set([
  "globalThis",
  "global",
  "self",
  "window",
  "frames",
  "parent",
  "top",
  "eval",
  "Function",
  "Reflect",
  "Proxy",
  "require"
])
// `Symbol.for` returns protocol symbols such as `~effect/Redactable`, whose
// methods receive the current Context. Only these members of `Symbol` are allowed.
const allowedSymbolMembers = new Set(["iterator", "asyncIterator"])
// `Object` members that cannot reveal symbol-keyed protocol methods.
const allowedObjectMembers = new Set(["keys", "values", "entries", "fromEntries", "assign", "freeze", "is"])

// Reading one of these on a service observes the whole object.
const objectMembers = new Set(Object.getOwnPropertyNames(Object.prototype))
// Members that read a whole Context from Fibers, runtimes or Contexts.
const exposingMembers = new Set(["context", "mapUnsafe"])

const pureComment = /[@#]__PURE__/

/** @internal */
export const analyze = (inputs: ReadonlyArray<ModuleInput>): Analysis => {
  const modules = new Map<string, Module>()
  for (const input of inputs) {
    const scope = analyzeScopes(input.program)
    const module: Module = { input, scope, exports: new Map(), stars: [] }
    collectExports(module)
    modules.set(input.id, module)
  }

  const globalBailouts: Array<string> = []
  const keyBailouts = new Map<string, Array<string>>()
  const keyDemand = new Map<string, Demand>()
  const literals = new Map<Node, LiteralInfo>()
  const functions = new Map<Node, FunctionInfo>()
  const flowCalls = new Set<Node>()
  const spreads: Array<SpreadContribution> = []
  // Keys provided at least once by something other than a tracked literal.
  const unknownProviders = new Set<string>()
  // Parameter spreads, and whether every argument for them is a tracked literal.
  const completeSpreads = new Map<Node, boolean>()
  const escapedNamespaces = new Set<Module>()
  const escapedBindings = new Set<Binding>()

  const location = (module: Module, node: Node) => {
    const code = module.input.code
    let line = 1
    for (let i = 0; i < node.start; i++) if (code.charCodeAt(i) === 10) line++
    return `${module.input.id}:${line} \`${code.slice(node.start, node.start + 60).replace(/\s+/g, " ")}\``
  }
  const globalBail = (module: Module, node: Node, reason: string) => {
    globalBailouts.push(`${reason} (${location(module, node)})`)
  }
  const demandOf = (key: string): Demand => {
    let demand = keyDemand.get(key)
    if (demand === undefined) {
      demand = new Demand()
      keyDemand.set(key, demand)
    }
    return demand
  }
  const bail = (key: string, module: Module, node: Node, reason: string) => {
    demandOf(key).setAll()
    let reasons = keyBailouts.get(key)
    if (reasons === undefined) {
      reasons = []
      keyBailouts.set(key, reasons)
    }
    reasons.push(`${reason} (${location(module, node)})`)
  }

  // == symbol resolution

  const moduleFor = (from: Module, source: string): Module | undefined => {
    const id = from.input.resolved.get(source)
    return id === undefined ? undefined : modules.get(id)
  }

  const resolveExport = (module: Module, name: string, seen = new Set<string>()): Sym | undefined => {
    const marker = `${module.input.id}#${name}`
    if (seen.has(marker)) return undefined
    seen.add(marker)
    const target = module.exports.get(name)
    if (target !== undefined) {
      switch (target._tag) {
        case "Local": {
          const binding = module.scope.scope.bindings.get(target.local)
          if (binding === undefined) return undefined
          return binding.kind === "import"
            ? resolveImport(module, binding, seen)
            : { _tag: "Binding", module, binding }
        }
        case "Reexport": {
          const source = moduleFor(module, target.source)
          return source && resolveExport(source, target.imported, seen)
        }
        case "Namespace": {
          const source = moduleFor(module, target.source)
          return source && { _tag: "Namespace", module: source }
        }
        case "Expression":
          return undefined
      }
    }
    if (name === "default") return undefined
    for (const star of module.stars) {
      const source = moduleFor(module, star)
      const sym = source && resolveExport(source, name, seen)
      if (sym) return sym
    }
    return undefined
  }

  const resolveImport = (module: Module, binding: Binding, seen?: Set<string>): Sym | undefined => {
    const specifier = binding.declaration
    const declaration = module.scope.parents.get(specifier)!
    const source = moduleFor(module, declaration.source.value)
    if (source === undefined) return undefined
    switch (specifier.type) {
      case "ImportNamespaceSpecifier":
        return { _tag: "Namespace", module: source }
      case "ImportDefaultSpecifier":
        return resolveExport(source, "default", seen)
      default:
        return resolveExport(source, staticName(specifier.imported, false)!, seen)
    }
  }

  const symbolOf = (module: Module, expr: Node): Sym | undefined => {
    const node = strip(expr)
    if (node.type === "Identifier") {
      const binding = module.scope.resolved.get(node)
      if (binding === undefined || binding.scope !== module.scope.scope) return undefined
      return binding.kind === "import" ? resolveImport(module, binding) : { _tag: "Binding", module, binding }
    }
    if (node.type === "MemberExpression") {
      const name = memberName(node)
      if (name === undefined) return undefined
      const object = symbolOf(module, node.object)
      return object?._tag === "Namespace" ? resolveExport(object.module, name) : undefined
    }
    return undefined
  }

  const apiName = (sym: Sym | undefined): string | undefined => {
    if (sym?._tag !== "Binding") return undefined
    const name = effectModuleName(sym.module.input.id)
    return name === undefined ? undefined : `${name}.${sym.binding.name}`
  }
  const apiOf = (module: Module, expr: Node) => apiName(symbolOf(module, expr))

  const symKey = (sym: Sym & { _tag: "Binding" }) => `${sym.module.input.id}#${sym.binding.name}`

  // == reference index: every use of a top-level binding, across modules

  const uses = new Map<string, Array<Use>>()
  const indexUse = (sym: Sym & { _tag: "Binding" }, use: Use) => {
    const key = symKey(sym)
    let list = uses.get(key)
    if (list === undefined) {
      list = []
      uses.set(key, list)
    }
    list.push(use)
  }

  const parentOf = (module: Module, node: Node): Node | undefined => module.scope.parents.get(node)

  // Walks up through type assertions and parentheses.
  const up = (module: Module, node: Node): { readonly node: Node; readonly parent: Node | undefined } => {
    let parent = parentOf(module, node)
    while (parent !== undefined && wrapperTypes.has(parent.type) && parent.expression === node) {
      node = parent
      parent = parentOf(module, node)
    }
    return { node, parent }
  }

  for (const module of modules.values()) {
    for (const binding of module.scope.scope.bindings.values()) {
      for (const ref of binding.refs) {
        let sym: Sym | undefined = binding.kind === "import"
          ? resolveImport(module, binding)
          : { _tag: "Binding", module, binding }
        let expr = ref.node
        while (sym?._tag === "Namespace") {
          const { node, parent } = up(module, expr)
          const name = parent?.type === "MemberExpression" && parent.object === node ? memberName(parent) : undefined
          if (name === undefined) {
            if (module.input.rendered) {
              if (!module.input.trusted) globalBail(module, expr, "module namespace used as a value")
              escapedNamespaces.add(sym.module)
            }
            sym = undefined
            break
          }
          expr = parent!
          sym = resolveExport(sym.module, name)
        }
        if (sym?._tag === "Binding") indexUse(sym, { module, expr, write: ref.write })
      }
    }
    if (module.input.isEntry) {
      for (const [name] of module.exports) {
        const sym = resolveExport(module, name)
        if (sym?._tag === "Binding") escapedBindings.add(sym.binding)
        else if (sym?._tag === "Namespace") escapedNamespaces.add(sym.module)
      }
      for (const star of module.stars) {
        const source = moduleFor(module, star)
        if (source) escapedNamespaces.add(source)
      }
    }
  }

  // Uses through an escaped namespace object are invisible, so every module
  // reachable through its exports escapes as a whole.
  const escapedModules = new Set<Module>()
  const escapeModule = (module: Module) => {
    if (escapedModules.has(module)) return
    escapedModules.add(module)
    const sources = [...module.stars]
    for (const target of module.exports.values()) {
      if (target._tag === "Reexport" || target._tag === "Namespace") sources.push(target.source)
      if (target._tag === "Local") {
        const binding = module.scope.scope.bindings.get(target.local)
        if (binding?.kind === "import") sources.push(module.scope.parents.get(binding.declaration)!.source.value)
      }
    }
    for (const source of sources) {
      const target = moduleFor(module, source)
      if (target) escapeModule(target)
    }
  }
  escapedNamespaces.forEach(escapeModule)

  const usesOf = (sym: Sym & { _tag: "Binding" }): ReadonlyArray<Use> => uses.get(symKey(sym)) ?? []

  const isEscapedBinding = (module: Module, binding: Binding) =>
    escapedBindings.has(binding) || (binding.scope === module.scope.scope && escapedModules.has(module))

  // All references of a binding, including uses from other modules for top-level bindings.
  const referencesOf = (module: Module, binding: Binding): ReadonlyArray<Use> =>
    binding.scope === module.scope.scope
      ? usesOf({ _tag: "Binding", module, binding })
      : binding.refs.map((ref) => ({ module, expr: ref.node, write: ref.write }))

  // == service keys

  const keys = new Map<string, string>() // symKey -> key string
  const keyCreation = (module: Module, expr: Node | null | undefined): string | null | undefined => {
    if (expr == null) return undefined
    const node = strip(expr)
    if (node.type !== "CallExpression") return undefined
    const callee = strip(node.callee)
    const api = apiOf(module, callee)
    const direct = api === "Context.Service" || api === "Context.Reference"
    const curried = callee.type === "CallExpression" && callee.arguments.length === 0 &&
      apiOf(module, callee.callee) === "Context.Service"
    if (!direct && !curried) return undefined
    const arg = node.arguments[0]
    return arg === undefined ? null : constString(module, arg) ?? null
  }
  // A string literal, or a const binding initialised with one.
  const constString = (module: Module, expr: Node): string | undefined => {
    const node = strip(expr)
    if (node.type !== "Identifier") return staticName(node, true)
    const sym = symbolOf(module, node)
    const declaration = sym?._tag === "Binding" && sym.binding.kind === "const" ? sym.binding.declaration : undefined
    return declaration?.type === "VariableDeclarator" && declaration.init
      ? staticName(strip(declaration.init), true)
      : undefined
  }
  const creationCallees = new Set<Node>()
  for (const module of modules.values()) {
    for (const binding of module.scope.scope.bindings.values()) {
      const declaration = binding.declaration
      const init = declaration.type === "VariableDeclarator" && declaration.id.type === "Identifier"
        ? declaration.init
        : declaration.type === "ClassDeclaration"
        ? declaration.superClass
        : undefined
      const key = keyCreation(module, init)
      if (typeof key !== "string") continue
      if (declaration.type === "VariableDeclarator" && binding.kind !== "const") continue
      const call = strip(init)
      creationCallees.add(strip(call.callee))
      creationCallees.add(strip(strip(call.callee).callee ?? call.callee))
      keys.set(symKey({ _tag: "Binding", module, binding }), key)
      if (isEscapedBinding(module, binding)) {
        bail(key, module, declaration, "service key escapes through an export or namespace")
      }
      if (declaration.type === "ClassDeclaration" && containsThis(declaration.body)) {
        bail(key, module, declaration, "class service with `this` in its body")
      }
    }
  }

  const keyOf = (module: Module, expr: Node): string | undefined => {
    const sym = symbolOf(module, expr)
    return sym?._tag === "Binding" ? keys.get(symKey(sym)) : undefined
  }

  // == consumers

  const isWriteTarget = (module: Module, node: Node): boolean => {
    const { node: self, parent } = up(module, node)
    if (parent === undefined) return false
    switch (parent.type) {
      case "AssignmentExpression":
        return parent.left === self
      case "UpdateExpression":
        return true
      case "UnaryExpression":
        return parent.operator === "delete"
      case "ForInStatement":
      case "ForOfStatement":
        return parent.left === self
      case "Property":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
      case "ObjectPattern":
        return true
      default:
        return false
    }
  }

  const valueUses = (module: Module, expr: Node, sink: ValueSink): void => {
    const { node, parent } = up(module, expr)
    if (parent === undefined) return sink.fail("value at program level")
    switch (parent.type) {
      case "MemberExpression": {
        if (parent.object !== node) break
        const name = memberName(parent)
        if (name === undefined) return sink.fail("computed member access")
        if (isWriteTarget(module, parent)) return sink.fail("member write")
        return sink.member(name)
      }
      case "ChainExpression":
        return valueUses(module, parent, sink)
      case "VariableDeclarator":
        if (parent.init !== node) break
        return patternUses(module, parent.id, sink)
      case "SpreadElement": {
        const literal = parentOf(module, parent)
        if (literal?.type === "ObjectExpression") return sink.spread(module, literal, parent)
        break
      }
      case "CallExpression":
      case "NewExpression": {
        const index = parent.arguments.indexOf(node)
        if (index !== -1 && sink.argument(module, parent, index)) return
        break
      }
    }
    sink.fail(`value used in ${parent.type}`)
  }

  const patternUses = (module: Module, pattern: Node, sink: ValueSink): void => {
    switch (pattern.type) {
      case "Identifier": {
        const binding = module.scope.declared.get(pattern)
        if (binding === undefined) return sink.fail("unresolved binding")
        if (isEscapedBinding(module, binding)) return sink.fail("exported binding")
        for (const ref of referencesOf(module, binding)) {
          if (ref.write) return sink.fail("reassigned binding")
          valueUses(ref.module, ref.expr, sink)
        }
        return
      }
      case "ObjectPattern":
        for (const property of pattern.properties) {
          const name = property.type === "Property" ? staticName(property.key, property.computed) : undefined
          if (name === undefined) return sink.fail("rest or computed destructuring")
          sink.member(name)
        }
        return
      case "AssignmentPattern":
        return patternUses(module, pattern.left, sink)
      default:
        sink.fail(`${pattern.type} pattern`)
    }
  }

  const callbackParam = (module: Module, fn: Node | undefined, sink: ValueSink): void => {
    const node = fn && strip(fn)
    if (node === undefined || !isFunctionNode(node)) return sink.fail("callback is not an inline function")
    // `arguments` aliases the value without going through the parameter.
    if (node.type !== "ArrowFunctionExpression" && referencesArguments(module, node)) {
      return sink.fail("callback reads `arguments`")
    }
    const param = node.params[0]
    if (param !== undefined) patternUses(module, param, sink)
  }

  // `expr` evaluates to an Effect that succeeds with the value described by `sink`.
  const effectUses = (module: Module, expr: Node, sink: ValueSink): void => {
    const { node, parent } = up(module, expr)
    if (parent?.type === "YieldExpression" && parent.delegate) return valueUses(module, parent, sink)
    if (parent?.type === "MemberExpression" && parent.object === node && memberName(parent) === "pipe") {
      const call = up(module, parent)
      if (call.parent?.type === "CallExpression" && call.parent.callee === call.node) {
        return pipeUses(module, call.parent, call.parent.arguments, 0, sink)
      }
    }
    if (parent?.type === "CallExpression" && parent.arguments[0] === node) {
      const api = apiOf(module, parent.callee)
      if (api !== undefined && effectOps.has(api) && parent.arguments.length >= 2) {
        return opUses(module, api, parent.arguments[1], parent, sink)
      }
      if (api === "Function.pipe") return pipeUses(module, parent, parent.arguments, 1, sink)
    }
    sink.fail(`effect used in ${parent?.type}`)
  }

  // `andThen` ignores the value when given anything but a function. Only a
  // syntactically non-callable argument proves that.
  const isNonCallable = (node: Node): boolean => {
    const value = strip(node)
    return value.type === "Literal" || value.type === "ObjectExpression" || value.type === "ArrayExpression" ||
      value.type === "TemplateLiteral"
  }

  const opUses = (module: Module, api: string, fn: Node, call: Node, sink: ValueSink): void => {
    if (api === "Effect.andThen" && isNonCallable(fn)) return
    callbackParam(module, fn, sink)
    if (api === "Effect.tap") effectUses(module, call, sink)
  }

  const pipeUses = (module: Module, call: Node, ops: ReadonlyArray<Node>, index: number, sink: ValueSink): void => {
    if (index >= ops.length) return effectUses(module, call, sink)
    const op = strip(ops[index])
    const api = op.type === "CallExpression" ? apiOf(module, op.callee) : undefined
    if (api === undefined || !effectOps.has(api) || op.arguments.length !== 1) {
      return sink.fail("unrecognised pipe operation")
    }
    if (api === "Effect.andThen" && isNonCallable(op.arguments[0])) return
    callbackParam(module, op.arguments[0], sink)
    if (api === "Effect.tap") pipeUses(module, call, ops, index + 1, sink)
  }

  const serviceSink = (key: string, module: Module, node: Node): ValueSink => ({
    member: (name) => {
      if (objectMembers.has(name)) bail(key, module, node, `inherited member \`${name}\` read`)
      else demandOf(key).add(name)
    },
    spread: (spreadModule, literal, spread) => {
      spreads.push({ key, module: spreadModule, literal, spread })
    },
    argument: () => false,
    fail: (reason) => bail(key, module, node, reason)
  })

  const contextSink = (module: Module, node: Node): ValueSink => ({
    member: () => globalBail(module, node, "member read on a whole Context"),
    spread: () => globalBail(module, node, "whole Context spread"),
    argument: (argModule, call, index) => index === 0 && retrievalApis.has(apiOf(argModule, call.callee) ?? ""),
    fail: (reason) => globalBail(module, node, `whole Context escapes: ${reason}`)
  })

  // Uses of provider objects before they reach a Context, e.g. in a release or
  // tap callback. Static reads add demand, anything else keeps the literal.
  const literalSink = (targets: ReadonlyArray<LiteralInfo>): ValueSink => ({
    member: (name) => {
      for (const literal of targets) {
        if (objectMembers.has(name)) literal.escaped = true
        else literal.demand.add(name)
      }
    },
    spread: () => {
      for (const literal of targets) literal.escaped = true
    },
    argument: () => false,
    fail: () => {
      for (const literal of targets) literal.escaped = true
    }
  })

  // == providers

  // Set whenever a provider flow reaches something other than an object
  // literal, so callers can tell a complete flow from a partial one.
  let unknownSource = false

  // Values returned by a function. Async functions return a Promise and
  // generators an iterator, so their return statements are not the result.
  const returnsOf = (fn: Node, generator = false): Array<Node> => {
    const node = strip(fn)
    if (!isFunctionNode(node) || node.async || node.generator !== generator) {
      unknownSource = true
      return []
    }
    if (node.body.type !== "BlockStatement") return [node.body]
    const out: Array<Node> = []
    const visit = (current: Node) => {
      for (const child of children(current)) {
        if (isFunctionNode(child) || child.type === "ClassDeclaration" || child.type === "ClassExpression") continue
        if (child.type === "ReturnStatement") {
          if (child.argument) out.push(child.argument)
        } else {
          visit(child)
        }
      }
    }
    visit(node.body)
    return out
  }

  const literalInfo = (module: Module, node: Node): LiteralInfo => {
    let info = literals.get(node)
    if (info === undefined) {
      info = { module, node, keys: new Set(), escaped: false, demand: new Demand(), links: [] }
      literals.set(node, info)
    }
    return info
  }

  // A const binding whose only use is `use` (so its value flows nowhere else).
  const singleUseInit = (module: Module, expr: Node): { module: Module; init: Node } | undefined => {
    const binding = module.scope.resolved.get(expr)
    if (binding === undefined || binding.kind !== "const" || isEscapedBinding(module, binding)) return undefined
    const declaration = binding.declaration
    if (declaration.type !== "VariableDeclarator" || declaration.id.type !== "Identifier" || !declaration.init) {
      return undefined
    }
    if (referencesOf(module, binding).length !== 1) return undefined
    return { module, init: declaration.init }
  }

  const functionOf = (module: Module, callee: Node): FunctionInfo | undefined => {
    const node = strip(callee)
    if (isFunctionNode(node)) return functionInfo(module, node, undefined)
    const sym = symbolOf(module, node)
    if (sym?._tag !== "Binding") return undefined
    const declaration = sym.binding.declaration
    if (declaration.type === "FunctionDeclaration") return functionInfo(sym.module, declaration, sym.binding)
    if (declaration.type === "VariableDeclarator" && sym.binding.kind === "const" && declaration.init) {
      const init = strip(declaration.init)
      if (isFunctionNode(init)) return functionInfo(sym.module, init, sym.binding)
    }
    return undefined
  }

  const functionInfo = (module: Module, node: Node, binding: Binding | undefined): FunctionInfo => {
    let info = functions.get(node)
    if (info === undefined) {
      info = { module, node, binding, calls: [] }
      functions.set(node, info)
    }
    return info
  }

  const flowValue = (module: Module, expr: Node, seen = new Set<Node>()): Array<LiteralInfo> => {
    const node = strip(expr)
    if (seen.has(node)) {
      unknownSource = true
      return []
    }
    seen.add(node)
    switch (node.type) {
      case "ObjectExpression":
        return [literalInfo(module, node)]
      case "ConditionalExpression":
        return [...flowValue(module, node.consequent, seen), ...flowValue(module, node.alternate, seen)]
      case "LogicalExpression":
        return [...flowValue(module, node.left, seen), ...flowValue(module, node.right, seen)]
      case "SequenceExpression":
        return flowValue(module, node.expressions[node.expressions.length - 1], seen)
      case "Identifier": {
        const single = singleUseInit(module, node)
        if (single) return flowValue(single.module, single.init, seen)
        break
      }
      case "CallExpression": {
        const callee = strip(node.callee)
        if (callee.type === "MemberExpression" && memberName(callee) === "of" && keyOf(module, callee.object)) {
          if (node.arguments.length === 1) return flowValue(module, node.arguments[0], seen)
          break
        }
        const fn = functionOf(module, callee)
        if (fn === undefined) break
        flowCalls.add(node)
        fn.calls.push({ module, call: node })
        return returnsOf(fn.node).flatMap((result) => flowValue(fn.module, result, seen))
      }
    }
    unknownSource = true
    return []
  }

  // Applies a callback that receives the provider objects as its first argument.
  const consume = (module: Module, fn: Node | undefined, targets: ReadonlyArray<LiteralInfo>) => {
    if (targets.length > 0) callbackParam(module, fn, literalSink(targets))
  }

  const flowEffect = (module: Module, expr: Node, seen = new Set<Node>()): Array<LiteralInfo> => {
    const node = strip(expr)
    if (seen.has(node)) {
      unknownSource = true
      return []
    }
    seen.add(node)
    if (node.type === "Identifier") {
      const single = singleUseInit(module, node)
      if (single) return flowEffect(single.module, single.init, seen)
    }
    if (node.type !== "CallExpression") {
      unknownSource = true
      return []
    }
    const args = node.arguments
    const callee = strip(node.callee)
    if (callee.type === "MemberExpression" && memberName(callee) === "pipe") {
      // Walks back from the last operation. Taps after the producing operation
      // receive the provider objects.
      const taps: Array<Node> = []
      const tapped = (targets: Array<LiteralInfo>) => {
        for (const tap of taps) consume(module, tap, targets)
        return targets
      }
      for (let i = args.length - 1; i >= 0; i--) {
        const op = strip(args[i])
        const api = op.type === "CallExpression" && op.arguments.length === 1 ? apiOf(module, op.callee) : undefined
        if (api === "Effect.map") {
          return tapped(returnsOf(op.arguments[0]).flatMap((r) => flowValue(module, r, seen)))
        }
        if (api === "Effect.flatMap") {
          return tapped(returnsOf(op.arguments[0]).flatMap((r) => flowEffect(module, r, seen)))
        }
        if (api !== "Effect.tap") {
          unknownSource = true
          return []
        }
        taps.push(op.arguments[0])
      }
      return tapped(flowEffect(module, callee.object, seen))
    }
    switch (apiOf(module, callee)) {
      case "Effect.succeed":
        if (args.length === 1) return flowValue(module, args[0], seen)
        break
      case "Effect.sync":
        if (args.length === 1) return returnsOf(args[0]).flatMap((r) => flowValue(module, r, seen))
        break
      case "Effect.map":
        if (args.length === 2) return returnsOf(args[1]).flatMap((r) => flowValue(module, r, seen))
        break
      case "Effect.flatMap":
        if (args.length === 2) return returnsOf(args[1]).flatMap((r) => flowEffect(module, r, seen))
        break
      case "Effect.acquireRelease":
      case "Effect.tap": {
        if (args.length !== 2) break
        // The release and tap callbacks receive the acquired value.
        const targets = flowEffect(module, args[0], seen)
        consume(module, args[1], targets)
        return targets
      }
      case "Effect.gen": {
        const body = args[args.length - 1]
        if (body) return returnsOf(body, true).flatMap((r) => flowValue(module, r, seen))
        break
      }
    }
    unknownSource = true
    return []
  }

  const insert = (key: string, flow: () => Array<LiteralInfo>) => {
    unknownSource = false
    for (const literal of flow()) literal.keys.add(key)
    if (unknownSource) unknownProviders.add(key)
  }
  const insertValue = (key: string, module: Module, expr: Node | undefined) =>
    insert(key, () => expr === undefined ? (unknownSource = true, []) : flowValue(module, expr))
  const insertEffect = (key: string, module: Module, expr: Node | undefined) =>
    insert(key, () => expr === undefined ? (unknownSource = true, []) : flowEffect(module, expr))

  // Applies `f` to the argument of a curried call `api(key)(arg)` and returns
  // that outer call.
  const curried = (module: Module, call: Node, f: (arg: Node | undefined) => void): Node | undefined => {
    const { node, parent } = up(module, call)
    if (parent?.type !== "CallExpression" || parent.callee !== node) return undefined
    f(parent.arguments[0])
    return parent
  }

  const layerCombinators = new Set(["Layer.merge", "Layer.mergeAll", "Layer.provide", "Layer.provideMerge"])

  // A Layer or Context built from a provider must stay inside the bundle:
  // whoever builds it can read every service it holds. `fail` is called when
  // it may escape.
  const containerFlow = (
    module: Module,
    expr: Node,
    fail: (reason: string) => void,
    seen = new Set<Node>()
  ): void => {
    if (seen.has(expr)) return
    seen.add(expr)
    const { node, parent } = up(module, expr)
    if (parent === undefined) return fail("Layer at program level")
    switch (parent.type) {
      case "CallExpression": {
        if (parent.callee === node) return fail("Layer called")
        const api = apiOf(module, parent.callee)
        if (api === "Effect.provide" || api === "Layer.launch") return
        if (api !== undefined && layerCombinators.has(api)) {
          // Curried combinators produce a function applied to another Layer.
          const applied = parent.arguments.length === 1 && api !== "Layer.mergeAll"
            ? appliedTo(module, parent)
            : parent
          return applied ? containerFlow(module, applied, fail, seen) : fail("curried Layer combinator escapes")
        }
        return fail(`Layer passed to ${api ?? "an unrecognised function"}`)
      }
      case "MemberExpression": {
        // `layer.pipe(...)` with Layer combinators only.
        const call = up(module, parent)
        if (
          parent.object !== node || memberName(parent) !== "pipe" || call.parent?.type !== "CallExpression" ||
          call.parent.callee !== call.node
        ) {
          break
        }
        for (const op of call.parent.arguments) {
          const opNode = strip(op)
          const api = opNode.type === "CallExpression" ? apiOf(module, opNode.callee) : undefined
          if (api === "Effect.provide" || api === "Layer.launch") return
          if (api === undefined || !layerCombinators.has(api)) return fail("Layer piped into an unrecognised function")
        }
        return containerFlow(module, call.parent, fail, seen)
      }
      case "VariableDeclarator": {
        if (parent.init !== node || parent.id.type !== "Identifier") break
        const binding = module.scope.declared.get(parent.id)!
        if (binding.kind !== "const") return fail("Layer in a mutable binding")
        if (isEscapedBinding(module, binding)) return fail("Layer exported from the entry module")
        for (const use of referencesOf(module, binding)) {
          if (use.module.input.rendered) containerFlow(use.module, use.expr, fail, seen)
        }
        return
      }
      case "ArrowFunctionExpression":
      case "ReturnStatement": {
        // Returned from a function: follow its calls.
        const fn = parent.type === "ArrowFunctionExpression" ? parent : enclosingFunction(module, parent)
        if (fn === undefined) break
        const owner = up(module, fn).parent
        const binding = owner?.type === "VariableDeclarator" && owner.id.type === "Identifier"
          ? module.scope.declared.get(owner.id)
          : fn.type === "FunctionDeclaration" && fn.id
          ? module.scope.declared.get(fn.id)
          : undefined
        if (binding === undefined || binding.scope !== module.scope.scope || binding.kind === "let") break
        if (isEscapedBinding(module, binding)) return fail("Layer factory exported from the entry module")
        for (const use of referencesOf(module, binding)) {
          if (!use.module.input.rendered) continue
          const call = up(use.module, use.expr)
          if (call.parent?.type !== "CallExpression" || call.parent.callee !== call.node) {
            return fail("Layer factory used as a value")
          }
          containerFlow(use.module, call.parent, fail, seen)
        }
        return
      }
    }
    fail(`Layer used in ${parent.type}`)
  }

  // For `f(...)` used as a pipe operation or called directly, the expression
  // holding its result.
  const appliedTo = (module: Module, call: Node): Node | undefined => {
    const { node, parent } = up(module, call)
    if (parent?.type !== "CallExpression") return undefined
    if (parent.callee === node) return parent
    const callee = strip(parent.callee)
    return callee.type === "MemberExpression" && memberName(callee) === "pipe" ? parent : undefined
  }

  const enclosingFunction = (module: Module, node: Node): Node | undefined => {
    for (let current = parentOf(module, node); current; current = parentOf(module, current)) {
      if (isFunctionNode(current)) return current
    }
    return undefined
  }

  const keyUse = (key: string, module: Module, expr: Node): void => {
    const sink = serviceSink(key, module, expr)
    // Untrusted code may store or mutate a key it passes around, which can
    // change what other keys resolve to.
    const escape = (reason: string) =>
      module.input.trusted
        ? bail(key, module, expr, reason)
        : globalBail(module, expr, `service key escapes: ${reason}`)
    const contained = (container: Node | undefined) => {
      if (container) containerFlow(module, container, (reason) => bail(key, module, expr, reason))
      else bail(key, module, expr, "Layer or Context escapes")
    }
    const { node, parent } = up(module, expr)
    if (parent?.type === "MemberExpression" && parent.object === node) {
      const name = memberName(parent)
      const call = up(module, parent)
      const isCall = call.parent?.type === "CallExpression" && call.parent.callee === call.node
      if (isWriteTarget(module, parent)) return globalBail(module, expr, `service key member \`${name}\` written`)
      if (name === "key") return
      if (isCall && name === "of") return
      if (isCall && (name === "use" || name === "useSync")) {
        return callbackParam(module, call.parent!.arguments[0], sink)
      }
      if (isCall && name === "context") {
        insertValue(key, module, call.parent!.arguments[0])
        return contained(call.parent)
      }
      if (isCall && name === "pipe") return pipeUses(module, call.parent!, call.parent!.arguments, 0, sink)
      return escape(`unrecognised member \`${name}\` of the service key`)
    }
    if (parent?.type === "CallExpression" && parent.callee !== node) {
      const index = parent.arguments.indexOf(node)
      const args = parent.arguments
      const api = apiOf(module, parent.callee)
      const returned = (fn: Node | undefined) =>
        insert(key, () => returnsOf(fn ?? parent).flatMap((r) => flowValue(module, r)))
      // Curried providers return a function that must be applied in the bundle.
      const applied = () => {
        if (appliedTo(module, parent) === undefined) bail(key, module, expr, "curried provider escapes")
      }
      switch (api) {
        case "Effect.service":
          return effectUses(module, parent, sink)
        case "Effect.map":
        case "Effect.flatMap":
        case "Effect.andThen":
        case "Effect.tap":
          if (index === 0 && args.length >= 2) return opUses(module, api, args[1], parent, sink)
          break
        case "Function.pipe":
          if (index === 0) return pipeUses(module, parent, args, 1, sink)
          break
        case "Context.get":
        case "Context.getUnsafe":
        case "Context.getOrElse":
        case "Context.getOrUndefined":
          if (index === 1) return valueUses(module, parent, sink)
          break
        case "Context.omit":
          return
        case "Layer.succeed":
          if (index === 0 && args.length === 2) {
            insertValue(key, module, args[1])
            return contained(parent)
          }
          if (index === 0) return contained(curried(module, parent, (arg) => insertValue(key, module, arg)))
          break
        case "Layer.effect":
          if (index === 0 && args.length === 2) {
            insertEffect(key, module, args[1])
            return contained(parent)
          }
          if (index === 0) return contained(curried(module, parent, (arg) => insertEffect(key, module, arg)))
          break
        case "Layer.sync":
          if (index === 0 && args.length === 2) {
            returned(args[1])
            return contained(parent)
          }
          if (index === 0) return contained(curried(module, parent, returned))
          break
        case "Effect.provideService":
          if (index === 1 && args.length === 3) return insertValue(key, module, args[2])
          if (index === 0 && args.length === 2) {
            insertValue(key, module, args[1])
            return applied()
          }
          break
        case "Effect.provideServiceEffect":
          if (index === 1 && args.length === 3) return insertEffect(key, module, args[2])
          if (index === 0 && args.length === 2) {
            insertEffect(key, module, args[1])
            return applied()
          }
          break
        case "Effect.updateService": {
          const fn = index === 1 && args.length === 3 ? args[2] : index === 0 && args.length === 2 ? args[1] : undefined
          if (fn === undefined) break
          callbackParam(module, fn, sink)
          returned(fn)
          if (args.length === 2) applied()
          return
        }
        case "Context.make":
          if (index === 0 && args.length === 2) {
            insertValue(key, module, args[1])
            return contained(parent)
          }
          break
        case "Context.add":
          if (index === 1 && args.length === 3) {
            insertValue(key, module, args[2])
            return contained(parent)
          }
          if (index === 0 && args.length === 2) {
            insertValue(key, module, args[1])
            return contained(appliedTo(module, parent))
          }
          break
      }
      return api === undefined
        ? escape("passed to an unrecognised function")
        : bail(key, module, expr, `passed to ${api}`)
    }
    if (parent?.type === "YieldExpression" && parent.delegate) return valueUses(module, parent, sink)
    escape(`used in ${parent?.type}`)
  }

  // == classify every use

  for (const [key, list] of uses) {
    const serviceKey = keys.get(key)
    for (const use of list) {
      const { module, expr } = use
      if (!module.input.rendered) continue
      if (serviceKey !== undefined) {
        if (use.write) bail(serviceKey, module, expr, "service key reassigned")
        else keyUse(serviceKey, module, expr)
        continue
      }
      const sym = symbolOf(module, expr)
      const api = apiName(sym)
      if (api === "Context.Service" || api === "Context.Reference") {
        if (!creationCallees.has(expr) && sym!._tag === "Binding" && sym!.module !== module) {
          const { parent } = up(module, expr)
          const literal = parent?.type === "CallExpression" ? keyCreation(module, parent) : undefined
          if (typeof literal === "string") bail(literal, module, expr, "service key created outside a declaration")
          else globalBail(module, expr, "service key with a dynamic or untracked key string")
        }
        continue
      }
      if (module.input.trusted || sym?._tag !== "Binding" || !sym.module.input.trusted) continue
      const name = `${sym.module.input.apiPrefix}.${sym.binding.name}`
      const { node, parent } = up(module, expr)
      const call = parent?.type === "CallExpression" && parent.callee === node ? parent : undefined
      if (name === "Effect.context" && call !== undefined) {
        effectUses(module, call, contextSink(module, expr))
        continue
      }
      // `runFork` returns the Fiber, so its result must also be discarded.
      if (
        name === "Effect.runFork" && call !== undefined && call.arguments.length === 1 &&
        up(module, call).parent?.type === "ExpressionStatement"
      ) {
        continue
      }
      if (runApis.has(name) && call !== undefined && call.arguments.length === 1) continue
      if (allowedApis.has(name) || allowedModules.has(sym.module.input.apiPrefix ?? "")) continue
      globalBail(module, expr, `${name} is not an audited API`)
    }
  }

  for (const module of modules.values()) {
    if (!module.input.rendered) continue
    // Code outside the analysed graph can do anything with the values it gets.
    for (const source of module.input.externalImports ?? []) {
      globalBail(module, module.input.program, `external import \`${source}\``)
    }
    if (module.input.trusted) continue
    for (const node of module.scope.globals) {
      const { node: self, parent } = up(module, node)
      const member = parent?.type === "MemberExpression" && parent.object === self ? memberName(parent) : undefined
      const call = parent?.type === "CallExpression" && parent.callee === self
      if (reflectiveGlobals.has(node.name)) {
        globalBail(module, node, `\`${node.name}\` may reach the global object or the running Fiber`)
      } else if (node.name === "Symbol" && !call && !allowedSymbolMembers.has(member ?? "")) {
        globalBail(module, node, `\`Symbol${member === undefined ? "" : `.${member}`}\` may reveal protocol symbols`)
      } else if (node.name === "Object" && !allowedObjectMembers.has(member ?? "")) {
        globalBail(module, node, `\`Object${member === undefined ? "" : `.${member}`}\` may reveal protocol symbols`)
      }
    }
    const visit = (node: Node) => {
      if (
        node.type === "MemberExpression" && exposingMembers.has(memberName(node) ?? "") &&
        symbolOf(module, node.object)?._tag !== "Namespace"
      ) {
        globalBail(module, node, `\`.${memberName(node)}\` may read a whole Context`)
      }
      if (node.type === "ImportExpression") globalBail(module, node, "dynamic import")
      if (node.type === "MemberExpression" && /^(?:prepare|capture)StackTrace$/.test(memberName(node) ?? "")) {
        globalBail(module, node, "stack trace hooks expose call frames")
      }
      for (const child of children(node)) visit(child)
    }
    visit(module.input.program)
  }

  // == entry exports
  //
  // An importer of the bundle can pass objects whose getters or `toString`
  // run inside a provider's scope, call exported functions with Effects or
  // Layers, or run exported Effects with its own logger. None of that can be
  // checked from here, so only primitive constants may be exported.
  for (const module of modules.values()) {
    if (!module.input.isEntry) continue
    for (const star of module.stars) globalBail(module, module.input.program, `entry module re-exports \`${star}\``)
    for (const [name] of module.exports) {
      const sym = resolveExport(module, name)
      const declaration = sym?._tag === "Binding" && sym.binding.kind === "const" ? sym.binding.declaration : undefined
      const init = declaration?.type === "VariableDeclarator" && declaration.init ? strip(declaration.init) : undefined
      const primitive = init !== undefined &&
        ((init.type === "Literal" && init.regex == null) ||
          (init.type === "TemplateLiteral" && init.expressions.length === 0))
      if (!primitive) globalBail(module, module.input.program, `entry module exports \`${name}\``)
    }
  }

  // == escapes of provider functions and their literals

  for (const fn of functions.values()) {
    let escaped = false
    if (fn.binding !== undefined) {
      if (isEscapedBinding(fn.module, fn.binding)) escaped = true
      for (const use of usesOf({ _tag: "Binding", module: fn.module, binding: fn.binding })) {
        const { node, parent } = up(use.module, use.expr)
        if (use.write || parent?.type !== "CallExpression" || parent.callee !== node || !flowCalls.has(parent)) {
          escaped = true
        }
      }
    }
    for (const result of returnsOf(fn.node)) {
      for (const literal of flowValue(fn.module, result)) {
        if (escaped) literal.escaped = true
        linkParamSpreads(fn, literal)
      }
    }
  }

  function usesArguments(fn: FunctionInfo): boolean {
    return referencesArguments(fn.module, fn.node)
  }

  function referencesArguments(module: Module, fn: Node): boolean {
    return module.scope.globals.some((node) => node.name === "arguments" && within(node, fn))
  }

  function linkParamSpreads(fn: FunctionInfo, literal: LiteralInfo) {
    for (const property of literal.node.properties) {
      if (property.type !== "SpreadElement") continue
      const argument = strip(property.argument)
      if (argument.type !== "Identifier") continue
      const param = fn.module.scope.resolved.get(argument)
      const index = param === undefined ? -1 : fn.node.params.indexOf(param.declaration)
      if (param === undefined || param.kind !== "param" || index === -1 || param.declaration.type !== "Identifier") {
        continue
      }
      // `arguments` aliases every parameter, so their uses cannot be listed.
      if (fn.node.type !== "ArrowFunctionExpression" && usesArguments(fn)) continue
      let complete = true
      for (const { module, call } of fn.calls) {
        const args: ReadonlyArray<Node> = call.arguments
        const arg = args[index]
        if (arg === undefined || args.slice(0, index + 1).some((arg) => arg.type === "SpreadElement")) {
          complete = false
          continue
        }
        unknownSource = false
        const targets = flowValue(module, arg)
        if (unknownSource) complete = false
        for (const target of targets) {
          if (!target.links.some((link) => link.from === literal && link.spread === property)) {
            target.links.push({ from: literal, spread: property, param })
          }
        }
      }
      completeSpreads.set(property, complete && (completeSpreads.get(property) ?? true))
    }
  }

  // == fixpoint

  const isPure = (module: Module, expr: Node): boolean => {
    const node = strip(expr)
    switch (node.type) {
      case "Identifier":
      case "Literal":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return true
      case "TemplateLiteral":
        return node.expressions.length === 0
      case "MemberExpression":
        // Reading an export through a module namespace has no side effects.
        return memberName(node) !== undefined && symbolOf(module, node.object)?._tag === "Namespace"
      case "CallExpression":
      case "NewExpression":
        return hasPureComment(module, node) && node.arguments.every((arg: Node) => isPure(module, arg))
      default:
        return false
    }
  }

  const hasPureComment = (module: Module, node: Node): boolean =>
    module.input.comments.some((comment) =>
      comment.end <= node.start && pureComment.test(comment.value) &&
      module.input.code.slice(comment.end, node.start).trim() === ""
    )

  const propertyName = (property: Node): string | undefined =>
    property.type === "Property" && property.kind === "init" ? staticName(property.key, property.computed) : undefined

  const isPrunable = (literal: LiteralInfo, property: Node): boolean => {
    const name = propertyName(property)
    return name !== undefined && name !== "__proto__" && isPure(literal.module, property.value)
  }

  const isRetained = (literal: LiteralInfo, property: Node): boolean =>
    !isPrunable(literal, property) || literal.demand.has(propertyName(property)!)

  const keysAfter = (literal: Node, spread: Node): Set<string> => {
    const out = new Set<string>()
    const index = literal.properties.indexOf(spread)
    for (const property of literal.properties.slice(index + 1)) {
      const name = propertyName(property)
      if (name !== undefined) out.add(name)
    }
    return out
  }

  // Properties read through `this` in a function body, ignoring nested
  // non-arrow functions.
  const thisReads = (module: Module, fn: Node, demand: Demand): boolean => {
    let changed = false
    const visit = (node: Node) => {
      for (const child of children(node)) {
        if (child.type === "FunctionExpression" || child.type === "FunctionDeclaration") continue
        if (child.type === "ThisExpression") {
          const { node: self, parent } = up(module, child)
          const name = parent?.type === "MemberExpression" && parent.object === self ? memberName(parent) : undefined
          changed = (name === undefined || objectMembers.has(name) || isWriteTarget(module, parent!)
            ? demand.setAll()
            : demand.add(name)) || changed
        }
        visit(child)
      }
    }
    if (fn.body) visit(fn.body)
    return changed
  }

  // Properties a property value may read through its receiver when called as
  // a method. Values that cannot be resolved may read anything.
  const receiverReads = (module: Module, expr: Node, demand: Demand, depth = 0): boolean => {
    const node = strip(expr)
    if (depth > 8) return demand.setAll()
    switch (node.type) {
      case "ArrowFunctionExpression":
      case "Literal":
      case "TemplateLiteral":
        return false
      case "FunctionExpression":
      case "FunctionDeclaration":
        return thisReads(module, node, demand)
      case "Identifier":
      case "MemberExpression": {
        const sym = symbolOf(module, node)
        if (sym?._tag !== "Binding") return demand.setAll()
        const declaration = sym.binding.declaration
        // A reassigned function may be anything at runtime.
        if (sym.binding.refs.some((ref) => ref.write)) return demand.setAll()
        if (declaration.type === "FunctionDeclaration") return thisReads(sym.module, declaration, demand)
        if (declaration.type === "VariableDeclarator" && sym.binding.kind === "const" && declaration.init) {
          return receiverReads(sym.module, declaration.init, demand, depth + 1)
        }
        return demand.setAll()
      }
      case "CallExpression": {
        // A call whose callee returns only resolvable functions, e.g. an IIFE.
        const fn = functionOf(module, node.callee)
        if (fn === undefined) return demand.setAll()
        unknownSource = false
        const results = returnsOf(fn.node)
        if (unknownSource || results.length === 0) return demand.setAll()
        let changed = false
        for (const result of results) changed = receiverReads(fn.module, result, demand, depth + 1) || changed
        return changed
      }
      default:
        return demand.setAll()
    }
  }

  // Reads through `this` by the methods a literal holds. Every object holding
  // a method can be its receiver, so a literal needs the reads of its own
  // retained methods and of every method spread into it. Only reads by its own
  // methods are owed by the objects spread into it: spread-in methods arrive
  // together with the properties they read.
  const ownReads = new Map<LiteralInfo, Demand>()
  const spreadInReads = new Map<LiteralInfo, Demand>()
  const demandIn = (map: Map<LiteralInfo, Demand>, literal: LiteralInfo) => {
    let demand = map.get(literal)
    if (demand === undefined) {
      demand = new Demand()
      map.set(literal, demand)
    }
    return demand
  }
  const methodReads = (literal: LiteralInfo): Demand => {
    const demand = new Demand()
    demand.addAll(demandIn(ownReads, literal))
    demand.addAll(demandIn(spreadInReads, literal))
    return demand
  }
  const consumerSpreads = new Map<Node, string>(spreads.map((c) => [c.spread, c.key]))

  const updateMethodReads = (literal: LiteralInfo): boolean => {
    const own = demandIn(ownReads, literal)
    const spreadIn = demandIn(spreadInReads, literal)
    let changed = false
    for (const property of literal.node.properties) {
      if (property.type === "SpreadElement") {
        if (completeSpreads.get(property) === true) continue
        const key = consumerSpreads.get(property)
        if (key !== undefined && !unknownProviders.has(key)) {
          for (const source of literals.values()) {
            if (source.keys.has(key)) changed = spreadIn.addAll(methodReads(source)) || changed
          }
          continue
        }
        // Methods from an unknown object may read any property.
        changed = own.setAll() || changed
      } else if (isRetained(literal, property)) {
        changed = receiverReads(literal.module, property.value, own) || changed
      }
    }
    for (const source of literals.values()) {
      if (source.links.some((link) => link.from === literal)) {
        changed = spreadIn.addAll(methodReads(source)) || changed
      }
    }
    return changed
  }

  const linkDemand = (link: ParamSpread, demand: Demand): boolean => {
    const { from, spread, param } = link
    let changed = demand.addAll(from.demand, keysAfter(from.node, spread))
    const module = from.module
    for (const ref of param.refs) {
      if (ref.node === strip(spread.argument)) continue
      const pruned = from.node.properties.some((property: Node) =>
        property.type === "Property" && within(ref.node, property) && !isRetained(from, property)
      )
      if (pruned) continue
      if (ref.write) {
        changed = demand.setAll() || changed
        continue
      }
      const { node, parent } = up(module, ref.node)
      const name = parent?.type === "MemberExpression" && parent.object === node ? memberName(parent) : undefined
      changed = (name === undefined || objectMembers.has(name) || isWriteTarget(module, parent!)
        ? demand.setAll()
        : demand.add(name)) || changed
    }
    return changed
  }

  // What a literal needs from the service objects spread into it.
  const owed = (literal: LiteralInfo): Demand => {
    const demand = new Demand()
    for (const key of literal.keys) demand.addAll(demandOf(key))
    for (const link of literal.links) linkDemand(link, demand)
    demand.addAll(demandIn(ownReads, literal))
    return demand
  }

  let changed = true
  while (changed) {
    changed = false
    for (const contribution of spreads) {
      const literal = literals.get(contribution.literal)
      const demand = demandOf(contribution.key)
      changed = (literal === undefined || literal.escaped || literal.keys.size === 0
        ? demand.setAll()
        : demand.addAll(owed(literal), keysAfter(literal.node, contribution.spread))) || changed
    }
    for (const literal of literals.values()) {
      const demand = literal.demand
      if (literal.escaped) {
        changed = demand.setAll() || changed
        continue
      }
      for (const key of literal.keys) changed = demand.addAll(demandOf(key)) || changed
      for (const link of literal.links) changed = linkDemand(link, demand) || changed
      changed = updateMethodReads(literal) || changed
      changed = demand.addAll(methodReads(literal)) || changed
      if (literal.keys.size === 0 && literal.links.length === 0) changed = demand.setAll() || changed
    }
  }

  // == edits

  const edits = new Map<string, Array<Edit>>()
  const removed: Array<string> = []
  if (globalBailouts.length === 0) {
    for (const literal of literals.values()) {
      if (literal.demand.all) continue
      const code = literal.module.input.code
      for (const property of literal.node.properties) {
        if (isRetained(literal, property)) continue
        // The separator may follow whitespace and comments.
        let end = property.end
        let next = end
        for (;;) {
          while (next < code.length && /\s/.test(code[next])) next++
          const comment = literal.module.input.comments.find((comment) => comment.start === next)
          if (comment === undefined) break
          next = comment.end
        }
        if (code[next] === ",") end = next + 1
        const id = literal.module.input.id
        let list = edits.get(id)
        if (list === undefined) {
          list = []
          edits.set(id, list)
        }
        list.push({ start: property.start, end })
        removed.push(`${id}:${propertyName(property)}`)
      }
    }
  }

  // A removed property can contain another removed property. Applying both
  // would shift the outer range, and removing the outer one covers the inner.
  for (const [id, list] of edits) {
    list.sort((a, b) => a.start - b.start || b.end - a.end)
    const disjoint: Array<Edit> = []
    for (const edit of list) {
      const last = disjoint[disjoint.length - 1]
      if (last === undefined || edit.start >= last.end) disjoint.push(edit)
    }
    edits.set(id, disjoint)
  }

  return {
    edits,
    globalBailouts,
    keyBailouts,
    demand: new Map([...keyDemand].map(([key, demand]) => [key, demand.all ? "all" : [...demand.names].sort()])),
    removed
  }
}

const within = (node: Node, outer: Node) => node.start >= outer.start && node.end <= outer.end

const containsThis = (node: Node): boolean =>
  node.type === "ThisExpression" ||
  children(node).some((child) => child.type !== "FunctionExpression" && containsThis(child))

const collectExports = (module: Module) => {
  for (const statement of module.input.program.body as ReadonlyArray<Node>) {
    if (statement.exportKind === "type" || statement.declare === true) continue
    switch (statement.type) {
      case "ExportNamedDeclaration": {
        const declaration = statement.declaration
        if (declaration) {
          if (declaration.declare === true || declaration.type.startsWith("TS")) continue
          const ids: Array<Node> = declaration.type === "VariableDeclaration"
            ? declaration.declarations.flatMap((d: Node) => bindingIds(d.id))
            : declaration.id
            ? [declaration.id]
            : []
          for (const id of ids) module.exports.set(id.name, { _tag: "Local", local: id.name })
        }
        for (const specifier of statement.specifiers ?? []) {
          if (specifier.exportKind === "type") continue
          const exported = staticName(specifier.exported, false)!
          const local = staticName(specifier.local, false)!
          module.exports.set(
            exported,
            statement.source
              ? { _tag: "Reexport", source: statement.source.value, imported: local }
              : { _tag: "Local", local }
          )
        }
        break
      }
      case "ExportDefaultDeclaration": {
        const declaration = statement.declaration
        module.exports.set(
          "default",
          declaration.id ? { _tag: "Local", local: declaration.id.name } : { _tag: "Expression" }
        )
        break
      }
      case "ExportAllDeclaration":
        if (statement.exported) {
          module.exports.set(staticName(statement.exported, false)!, {
            _tag: "Namespace",
            source: statement.source.value
          })
        } else {
          module.stars.push(statement.source.value)
        }
        break
    }
  }
}

const bindingIds = (pattern: Node): Array<Node> => {
  switch (pattern.type) {
    case "Identifier":
      return [pattern]
    case "ObjectPattern":
      return pattern.properties.flatMap((p: Node) => bindingIds(p.type === "RestElement" ? p.argument : p.value))
    case "ArrayPattern":
      return pattern.elements.flatMap((e: Node | null) => (e ? bindingIds(e) : []))
    case "AssignmentPattern":
      return bindingIds(pattern.left)
    case "RestElement":
      return bindingIds(pattern.argument)
    default:
      return []
  }
}
