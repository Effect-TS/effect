/** A binding's identity is independent of its eventual spelling. */
export interface Binding {
  readonly _tag: "Binding"
  readonly preferredName: string
  readonly toString: () => never
}

interface ImportBinding extends Binding {
  readonly import: Import
}

export interface DeclarationBinding extends Binding {
  readonly name: string
}

// Object fragments throw on string coercion to prevent accidental "[object Object]" output.
// Compose them with `code` so bindings and import aliases are resolved during rendering.
export type Fragment = string | Binding | {
  readonly _tag: "Parts"
  readonly parts: ReadonlyArray<Fragment>
  readonly toString: () => never
} | {
  readonly _tag: "Deferred"
  readonly render: (render: Render) => string
  readonly toString: () => never
}

export type Render = (fragment: Fragment) => string

export type CodeHole = Fragment | number | ReadonlyArray<CodeHole> | undefined | null | false

export interface Import {
  readonly module: string
  readonly kind: "Namespace" | "Default" | "Named"
  readonly imported: string
  readonly local: string
  readonly typeOnly: boolean
  readonly attributes: string
}

interface Declaration {
  readonly binding: Binding
  readonly fragments: ReadonlyArray<Fragment>
  readonly dependencies: ReadonlyArray<Binding>
}

const keywords = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "any",
  "boolean",
  "bigint",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "unknown",
  "undefined",
  "intrinsic",
  "eval",
  "arguments"
])

function cannotCoerce(): never {
  throw new Error("Code fragments must be rendered by their module")
}

function binding(preferredName: string): Binding {
  return { _tag: "Binding", preferredName, toString: cannotCoerce }
}

function importKey(input: Import): string {
  return JSON.stringify([input.module, input.kind, input.imported, input.attributes])
}

function imported(input: Import): ImportBinding {
  return { ...binding(input.local), import: input }
}

export function importNamespace(
  module: string,
  local: string,
  options?: { readonly typeOnly?: boolean | undefined }
): Binding {
  return imported({
    module,
    local,
    kind: "Namespace",
    imported: "*",
    typeOnly: options?.typeOnly === true,
    attributes: ""
  })
}

export function importNamed(
  module: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): Binding {
  return imported({
    module,
    local: name,
    kind: "Named",
    imported: name,
    typeOnly: options?.typeOnly === true,
    attributes: ""
  })
}

export function importDefault(
  module: string,
  local: string,
  options?: { readonly typeOnly?: boolean | undefined }
): Binding {
  return imported({
    module,
    local,
    kind: "Default",
    imported: "default",
    typeOnly: options?.typeOnly === true,
    attributes: ""
  })
}

function append(value: CodeHole, parts: Array<Fragment>): void {
  if (value === undefined || value === null || value === false || value === "") return
  if (Array.isArray(value)) {
    for (const item of value) append(item, parts)
  } else {
    parts.push(typeof value === "number" ? String(value) : value as Fragment)
  }
}

export function code(strings: TemplateStringsArray, ...values: ReadonlyArray<CodeHole>): Fragment {
  const parts: Array<Fragment> = []
  for (let i = 0; i < strings.length; i++) {
    append(strings[i], parts)
    append(values[i], parts)
  }
  return { _tag: "Parts", parts, toString: cannotCoerce }
}

export function join(values: ReadonlyArray<CodeHole>, separator: string): Fragment {
  const parts: Array<Fragment> = []
  for (let i = 0; i < values.length; i++) {
    if (i > 0) parts.push(separator)
    append(values[i], parts)
  }
  return { _tag: "Parts", parts, toString: cannotCoerce }
}

export function deferred(render: (render: Render) => string): Fragment {
  return { _tag: "Deferred", render, toString: cannotCoerce }
}

export function indent(content: CodeHole): Fragment {
  const fragment = join([content], "")
  return deferred((render) => render(fragment).replace(/\n(?=[^\n])/g, "\n  "))
}

export function literal(value: string | number | bigint | boolean | null | undefined): string {
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "bigint") return `${value}n`
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "globalThis.NaN"
    if (value === Infinity) return "globalThis.Infinity"
    if (value === -Infinity) return "-globalThis.Infinity"
    if (Object.is(value, -0)) return "-0"
  }
  return String(value)
}

const isIdentifier = (name: string): boolean => /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name)

export function propertyKey(name: string): string {
  return name === "__proto__" ? `[${literal(name)}]` : isIdentifier(name) ? name : literal(name)
}

export function docComment(text: string | ReadonlyArray<string>): string {
  const lines = (typeof text === "string" ? [text] : text)
    .flatMap((line) => line.split(/\r\n?|\n/))
    .map((line) => line.trimEnd().replaceAll("*/", "*\\/"))
  while (lines[0] === "") lines.shift()
  while (lines[lines.length - 1] === "") lines.pop()
  if (lines.length === 0) return ""
  return lines.length === 1
    ? `/** ${lines[0]} */\n`
    : `/**\n${lines.map((line) => line === "" ? " *" : ` * ${line}`).join("\n")}\n */\n`
}

export interface Scope {
  readonly _tag: "Scope"
}

interface ScopeState extends Scope {
  readonly owner: object
  readonly taken: Set<string>
  readonly nested: Set<string>
  readonly parent: ScopeState | undefined
}

interface UsedImport {
  readonly input: Import
  readonly local: string
  runtime: boolean
}

function printImports(imports: ReadonlyArray<UsedImport | string>): ReadonlyArray<string> {
  const lines: Array<string> = []
  const groups = new Map<string, Array<UsedImport>>()
  for (const used of imports) {
    if (typeof used === "string") continue
    const { input } = used
    if (input.kind === "Named") {
      const key = JSON.stringify([input.module, input.attributes])
      const group = groups.get(key)
      if (group === undefined) groups.set(key, [used])
      else group.push(used)
    }
  }
  for (const used of imports) {
    if (typeof used === "string") {
      lines.push(used)
      continue
    }
    const { input, local, runtime } = used
    if (input.kind !== "Named") {
      lines.push(
        `import ${runtime ? "" : "type "}${input.kind === "Namespace" ? "* as " : ""}${local} from ${
          literal(input.module)
        }${input.attributes}`
      )
      continue
    }
    const key = JSON.stringify([input.module, input.attributes])
    const group = groups.get(key)
    if (group === undefined) continue
    const typeOnly = group.every((used) => !used.runtime)
    if (!typeOnly && !runtime) continue
    groups.delete(key)
    const specifiers = group.map(({ input, local, runtime }) =>
      `${typeOnly || runtime ? "" : "type "}${isIdentifier(input.imported) ? input.imported : literal(input.imported)}${
        input.imported === local ? "" : ` as ${local}`
      }`
    )
    lines.push(
      `import ${typeOnly ? "type " : ""}{ ${specifiers.join(", ")} } from ${literal(input.module)}${input.attributes}`
    )
  }
  return lines
}

/** Mutable state for generating one module. */
export interface Module {
  readonly reserved: ReadonlySet<string>
  readonly root: ScopeState
  readonly declarations: Map<Binding, Declaration>
  readonly imports: Map<string, ImportBinding>
  readonly provided: Map<string, ImportBinding>
  readonly sideEffects: Set<string>
  readonly importOrder: Array<ImportBinding | string>
  readonly body: Array<Fragment>
  readonly bindings: Map<Binding, string>
}

export function make(reserved: ReadonlyArray<string> = []): Module {
  return {
    reserved: new Set([...keywords, "globalThis", ...reserved]),
    root: {
      _tag: "Scope",
      owner: {},
      taken: new Set<string>(),
      nested: new Set<string>(),
      parent: undefined
    },
    declarations: new Map(),
    imports: new Map(),
    provided: new Map(),
    sideEffects: new Set(),
    importOrder: [],
    body: [],
    bindings: new Map()
  }
}

function getScope(self: Module, scope: Scope): ScopeState {
  const state = scope as ScopeState
  if (state.owner !== self.root.owner) throw new Error("Scope belongs to another module")
  return state
}

export function scope(self: Module, parent: Scope = self.root): Scope {
  const state = getScope(self, parent)
  const scope: ScopeState = {
    _tag: "Scope",
    owner: state.owner,
    taken: new Set(),
    nested: new Set(),
    parent: state
  }
  return scope
}

function reserve(scope: ScopeState, name: string): void {
  scope.taken.add(name)
  for (let current = scope.parent; current !== undefined; current = current.parent) {
    current.nested.add(name)
  }
}

export function declare(
  self: Module,
  preferredName: string,
  options?: { readonly exact?: boolean | undefined; readonly scope?: Scope | undefined }
): DeclarationBinding {
  const scope = getScope(self, options?.scope ?? self.root)
  const takenBy = (name: string): string | undefined => {
    if (self.reserved.has(name)) return "it is reserved"
    if (scope.nested.has(name)) return "a nested scope declares it"
    for (let current: ScopeState | undefined = scope; current !== undefined; current = current.parent) {
      if (current.taken.has(name)) {
        return current === scope
          ? "this scope declares it"
          : "an enclosing scope declares it"
      }
    }
    return undefined
  }
  if (options?.exact) {
    const reason = isIdentifier(preferredName) ? takenBy(preferredName) : "it is not an identifier"
    if (reason !== undefined) throw new Error(`Cannot declare exact name ${literal(preferredName)}: ${reason}`)
  }
  const name = options?.exact ? preferredName : allocate(preferredName, (name) => takenBy(name) !== undefined)
  const local: DeclarationBinding = { ...binding(preferredName), name }
  reserve(scope, name)
  self.bindings.set(local, name)
  return local
}

export function define(
  self: Module,
  binding: Binding,
  fragments: ReadonlyArray<Fragment>,
  dependencies: ReadonlyArray<Binding> = []
): void {
  if (!self.bindings.has(binding)) {
    throw new Error("Expected a declaration binding owned by this module")
  }
  if (self.declarations.has(binding)) {
    throw new Error(`Duplicate definition: ${binding.preferredName}`)
  }
  self.declarations.set(binding, { binding, fragments, dependencies })
}

export function addImport(self: Module, input: Import): Binding {
  const key = JSON.stringify([importKey(input), input.local, input.typeOnly])
  const existing = self.imports.get(key)
  if (existing !== undefined) return existing
  const result = imported(input)
  self.imports.set(key, result)
  self.importOrder.push(result)
  return result
}

export function provideImport(self: Module, input: Import): Binding {
  const key = importKey(input)
  const existing = self.provided.get(key)
  if (existing !== undefined && existing.import.local === input.local) return existing
  const root = self.root
  if (
    existing !== undefined || self.reserved.has(input.local) || root.taken.has(input.local) ||
    root.nested.has(input.local)
  ) {
    throw new Error(`Conflicting predefined import: ${input.local}`)
  }
  const result = imported(input)
  reserve(root, input.local)
  self.provided.set(key, result)
  return result
}

export function addSideEffect(self: Module, module: string, attributes = ""): void {
  const source = `import ${literal(module)}${attributes}`
  if (!self.sideEffects.has(source)) {
    self.sideEffects.add(source)
    self.importOrder.push(source)
  }
}

export function add(self: Module, fragment: Fragment): void {
  self.body.push(fragment)
}

function allocate(preferredName: string, isTaken: (name: string) => boolean): string {
  const base = preferredName.replace(/[^$_\u200c\u200d\p{ID_Continue}]/gu, "_") || "_"
  const valid = /^[$_\p{ID_Start}]/u.test(base) ? base : `_${base}`
  let name = valid
  let suffix = 0
  while (isTaken(name)) name = `${valid}${++suffix}`
  return name
}

function renderer(self: Module, names: Map<Binding, string>, imports: Map<string, UsedImport>): Render {
  const root = self.root
  const taken = new Set([...self.reserved, ...root.taken, ...root.nested])
  const cache = new Map<Fragment, string>()
  const render: Render = (fragment) => {
    if (typeof fragment === "string") return fragment
    const previous = cache.get(fragment)
    if (previous !== undefined) return previous
    let value: string
    switch (fragment._tag) {
      case "Parts":
        value = fragment.parts.map(render).join("")
        break
      case "Deferred":
        value = fragment.render(render)
        break
      case "Binding": {
        if ("import" in fragment) {
          const input = (fragment as ImportBinding).import
          const key = importKey(input)
          const provided = self.provided.get(key)
          if (provided !== undefined) {
            value = provided.import.local
          } else {
            let used = imports.get(key)
            if (used === undefined) {
              const local = allocate(input.local, (name) => taken.has(name))
              taken.add(local)
              used = { input, local, runtime: false }
              imports.set(key, used)
            }
            used.runtime ||= !input.typeOnly
            value = used.local
          }
          names.set(fragment, value)
        } else {
          const name = names.get(fragment)
          if (name === undefined) throw new Error("Binding belongs to another module")
          value = name
        }
        break
      }
    }
    cache.set(fragment, value)
    return value
  }
  return render
}

/** Definitions precede appended source and follow their supplied dependencies. */
export function finalize(self: Module, roots: ReadonlyArray<Fragment> = []): {
  readonly names: ReadonlyMap<Binding, string>
  readonly declarations: ReadonlyArray<{ readonly binding: Binding; readonly fragments: ReadonlyArray<string> }>
  readonly roots: ReadonlyArray<string>
  readonly imports: ReadonlyArray<string>
  readonly body: ReadonlyArray<string>
} {
  const visiting = new Set<Binding>()
  const visited = new Set<Binding>()
  const ordered: Array<Declaration> = []
  const visit = (binding: Binding): void => {
    if (visited.has(binding) || "import" in binding) return
    if (visiting.has(binding)) throw new Error(`Cyclic initialization dependency: ${binding.preferredName}`)
    const declaration = self.declarations.get(binding)
    if (declaration === undefined) throw new Error(`Missing definition: ${binding.preferredName}`)
    visiting.add(binding)
    for (const dependency of declaration.dependencies) visit(dependency)
    visiting.delete(binding)
    visited.add(binding)
    ordered.push(declaration)
  }
  for (const binding of self.declarations.keys()) visit(binding)

  const names = new Map(self.bindings)
  const imports = new Map<string, UsedImport>()
  const render = renderer(self, names, imports)
  const output = {
    names,
    declarations: ordered.map(({ binding, fragments }) => ({ binding, fragments: fragments.map(render) })),
    roots: roots.map(render),
    body: self.body.map(render)
  }
  const orderedImports: Array<string | UsedImport> = []
  for (const entry of self.importOrder) {
    if (typeof entry === "string") {
      orderedImports.push(entry)
    } else {
      const key = importKey(entry.import)
      const used = imports.get(key)
      if (used !== undefined && (!used.runtime || !entry.import.typeOnly)) {
        orderedImports.push(used)
        imports.delete(key)
      }
    }
  }
  return { ...output, imports: printImports([...orderedImports, ...imports.values()]) }
}

export function print(self: Module): string {
  const output = finalize(self)
  return [
    output.imports.join("\n"),
    ...output.declarations.flatMap((declaration) => declaration.fragments),
    ...output.body
  ]
    .filter((part) => part !== "").join("\n\n") + "\n"
}
