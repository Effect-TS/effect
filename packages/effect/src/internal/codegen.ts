/** A binding's identity is independent of its eventual spelling. */
export interface Binding {
  readonly _tag: "Binding"
  readonly preferredName: string
  readonly toString: () => never
}

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

export function code(strings: TemplateStringsArray, ...values: ReadonlyArray<Fragment>): Fragment {
  const parts: Array<Fragment> = [strings[0]]
  for (let i = 0; i < values.length; i++) parts.push(values[i], strings[i + 1])
  return { _tag: "Parts", parts, toString: cannotCoerce }
}

export function join(parts: ReadonlyArray<Fragment>, separator: string): Fragment {
  return {
    _tag: "Parts",
    parts: parts.flatMap((part, index) => index === 0 ? [part] : [separator, part]),
    toString: cannotCoerce
  }
}

export function deferred(render: (render: Render) => string): Fragment {
  return { _tag: "Deferred", render, toString: cannotCoerce }
}

/** One module's bindings and declarations. Callers supply initialization dependencies. */
export class Module {
  private readonly fixed: ReadonlySet<string>
  private readonly reserved: Set<string>
  private readonly bindings: Array<Binding> = []
  private readonly declarations = new Map<Binding, Declaration>()
  private readonly imports = new Map<string, { readonly binding: Binding; readonly signature: string }>()
  private readonly names = new Map<Binding, string>()
  private readonly importedBindings = new Set<Binding>()
  private taken: Set<string>
  private finalized = false
  private complete = false

  constructor(reserved: ReadonlyArray<string> = []) {
    this.fixed = new Set(reserved)
    this.reserved = new Set([...keywords, ...reserved])
    this.taken = new Set(this.reserved)
  }

  declare(preferredName: string): Binding {
    if (this.finalized) throw new Error("Cannot declare a binding after finalization")
    const binding: Binding = { _tag: "Binding", preferredName, toString: cannotCoerce }
    this.bindings.push(binding)
    this.names.set(binding, this.allocate(preferredName))
    return binding
  }

  define(binding: Binding, fragments: ReadonlyArray<Fragment>, dependencies: ReadonlyArray<Binding> = []): void {
    if (this.finalized) throw new Error("Cannot define a binding after finalization")
    if (!this.names.has(binding) || this.importedBindings.has(binding)) {
      throw new Error("Expected a declaration binding owned by this module")
    }
    if (this.declarations.has(binding)) {
      throw new Error(`Duplicate definition: ${binding.preferredName}`)
    }
    this.declarations.set(binding, { binding, fragments, dependencies })
  }

  addImport(input: Import): Binding {
    if (this.complete) throw new Error("Cannot add an import after finalization")
    const signature = JSON.stringify([input.module, input.kind, input.imported, input.attributes])
    const existing = this.imports.get(input.local)
    if (existing !== undefined) {
      if (existing.signature !== signature) throw new Error(`Conflicting imports for ${input.local}`)
      return existing.binding
    }
    if (this.fixed.has(input.local)) throw new Error(`Import shadows a reserved binding: ${input.local}`)
    if (this.finalized && this.taken.has(input.local)) {
      throw new Error(`Import introduced a new naming conflict after finalization: ${input.local}`)
    }
    const binding: Binding = { _tag: "Binding", preferredName: input.local, toString: cannotCoerce }
    this.imports.set(input.local, { binding, signature })
    this.importedBindings.add(binding)
    this.names.set(binding, input.local)
    if (this.finalized) this.taken.add(input.local)
    return binding
  }

  private allocate(preferredName: string): string {
    const base = preferredName.replace(/[^$_\u200c\u200d\p{ID_Continue}]/gu, "_") || "_"
    const valid = /^[$_\p{ID_Start}]/u.test(base) ? base : `_${base}`
    let name = valid
    let suffix = 0
    while (this.taken.has(name)) name = `${valid}${++suffix}`
    this.taken.add(name)
    return name
  }

  private renderer(): Render {
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
          const name = this.names.get(fragment)
          if (name === undefined) throw new Error("Binding belongs to another module")
          value = name
          break
        }
      }
      cache.set(fragment, value)
      return value
    }
    return render
  }

  finalize(roots: ReadonlyArray<Fragment>): {
    readonly names: ReadonlyMap<Binding, string>
    readonly declarations: ReadonlyArray<{ readonly binding: Binding; readonly fragments: ReadonlyArray<string> }>
    readonly roots: ReadonlyArray<string>
  } {
    if (this.finalized) throw new Error("Module has already been finalized")
    const visiting = new Set<Binding>()
    const visited = new Set<Binding>()
    const ordered: Array<Declaration> = []
    const visit = (binding: Binding): void => {
      if (visited.has(binding) || this.importedBindings.has(binding)) return
      if (visiting.has(binding)) throw new Error(`Cyclic initialization dependency: ${binding.preferredName}`)
      const declaration = this.declarations.get(binding)
      if (declaration === undefined) throw new Error(`Missing definition: ${binding.preferredName}`)
      visiting.add(binding)
      for (const dependency of declaration.dependencies) visit(dependency)
      visiting.delete(binding)
      visited.add(binding)
      ordered.push(declaration)
    }
    for (const declaration of this.declarations.values()) visit(declaration.binding)

    // Deferred adapters discover their imports using provisional names.
    const preview = this.renderer()
    for (const declaration of ordered) declaration.fragments.forEach(preview)
    roots.forEach(preview)

    this.taken = new Set([...this.reserved, ...this.imports.keys()])
    for (const binding of this.bindings) this.names.set(binding, this.allocate(binding.preferredName))
    this.finalized = true
    const render = this.renderer()
    const output = {
      names: this.names,
      declarations: ordered.map(({ binding, fragments }) => ({ binding, fragments: fragments.map(render) })),
      roots: roots.map(render)
    }
    this.complete = true
    return output
  }
}
