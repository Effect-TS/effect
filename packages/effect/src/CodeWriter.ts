/**
 * Build TypeScript modules for code generators.
 *
 * A `CodeWriter` collects the source of one module and prints it together with
 * the imports that source uses. Write source with the {@link code} template and
 * interpolate {@link CodeSymbol}s into it. Imports ({@link importNamespace},
 * {@link importNamed}, {@link importDefault}) are not tied to a writer, so they
 * can be module-level constants. {@link print} gives them local names, and
 * imports that no printed code uses are left out. Names of your own
 * declarations come from {@link declare}, and nested {@link scope}s hold local
 * names such as function parameters.
 *
 * @stability unstable
 * @since 4.1.4
 */

const TypeId = "~effect/CodeWriter"
const ScopeTypeId = "~effect/CodeWriter/CodeScope"
const SymbolTypeId = "~effect/CodeWriter/CodeSymbol"
const FragmentTypeId = "~effect/CodeWriter/CodeFragment"

/**
 * Writes one TypeScript module.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeWriter {
  readonly [TypeId]: typeof TypeId
}

/**
 * A nested scope of a {@link CodeWriter}, such as a function body, for local
 * declarations.
 *
 * **Details**
 *
 * A name declared in a scope never shadows a name of an enclosing scope or the
 * module, and is never shadowed by a name of a nested scope. Sibling scopes may
 * use the same names.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeScope {
  readonly [ScopeTypeId]: typeof ScopeTypeId
}

/**
 * A name to interpolate into the {@link code} template: an import or a
 * {@link CodeDeclaration}.
 *
 * **Gotchas**
 *
 * Converting a symbol to a string throws, so an import can never go missing
 * silently.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeSymbol {
  readonly [SymbolTypeId]: typeof SymbolTypeId
}

/**
 * A symbol for a declaration of your own, created by {@link declare}. Its
 * `name` is final.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeDeclaration extends CodeSymbol {
  readonly name: string
}

/**
 * Source built with the {@link code} template. It keeps the symbols
 * interpolated into it, so the imports they need are printed with it.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeFragment {
  readonly [FragmentTypeId]: typeof FragmentTypeId
}

/**
 * Value that can be interpolated into a {@link code} template: text, numbers,
 * symbols, fragments and arrays of them. `undefined`, `null` and `false` print
 * nothing.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export type CodeHole =
  | string
  | number
  | CodeSymbol
  | CodeFragment
  | ReadonlyArray<CodeHole>
  | undefined
  | null
  | false

const reservedWords: ReadonlySet<string> = new Set([
  "any",
  "arguments",
  "await",
  "bigint",
  "boolean",
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
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "globalThis",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "never",
  "new",
  "null",
  "number",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield"
])

const isIdentifierName = (name: string): boolean => /^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*$/u.test(name)

const sanitize = (name: string): string => {
  const out = name.replace(/[^\p{ID_Continue}$\u200c\u200d]/gu, "_")
  return /^[\p{ID_Start}$_]/u.test(out) ? out : `_${out}`
}

/** Returns `wanted`, or `wanted` with the first numeric suffix that is free. */
const freeName = (wanted: string, isTaken: (name: string) => boolean): string => {
  let name = wanted
  for (let n = 2; reservedWords.has(name) || isTaken(name); n++) name = `${wanted}${n}`
  return name
}

class WriterImpl implements CodeWriter {
  readonly [TypeId] = TypeId
  readonly taken = new Set<string>()
  readonly children: Array<ScopeImpl> = []
  readonly sideEffects: Array<string> = []
  readonly body: Array<string | FragmentImpl> = []
}

class ScopeImpl implements CodeScope {
  readonly [ScopeTypeId] = ScopeTypeId
  readonly taken = new Set<string>()
  readonly children: Array<ScopeImpl> = []
  readonly parent: WriterImpl | ScopeImpl
  readonly writer: WriterImpl
  constructor(parent: WriterImpl | ScopeImpl) {
    this.parent = parent
    this.writer = parent instanceof ScopeImpl ? parent.writer : parent
  }
}

type ImportStyle = "namespace" | "named" | "default"

class ImportImpl implements CodeSymbol {
  readonly [SymbolTypeId] = SymbolTypeId
  /** Identifies the import statement: one per module for namespace and default imports, one per name otherwise. */
  readonly key: string
  readonly from: string
  readonly style: ImportStyle
  readonly name: string
  readonly typeOnly: boolean
  constructor(from: string, style: ImportStyle, name: string, typeOnly: boolean) {
    this.key = JSON.stringify([style, from, style === "named" ? name : ""])
    this.from = from
    this.style = style
    this.name = name
    this.typeOnly = typeOnly
  }
  toString(): string {
    throw new Error(`Import of "${this.name}" used in a plain string; interpolate it into CodeWriter.code`)
  }
}

class DeclarationImpl implements CodeDeclaration {
  readonly [SymbolTypeId] = SymbolTypeId
  readonly name: string
  readonly writer: WriterImpl
  constructor(name: string, writer: WriterImpl) {
    this.name = name
    this.writer = writer
  }
  toString(): string {
    throw new Error(`Declaration "${this.name}" used in a plain string; interpolate it into CodeWriter.code`)
  }
}

type Part = string | ImportImpl | DeclarationImpl | FragmentImpl

class FragmentImpl implements CodeFragment {
  readonly [FragmentTypeId] = FragmentTypeId
  readonly parts: ReadonlyArray<Part>
  readonly indented: boolean
  constructor(parts: ReadonlyArray<Part>, indented: boolean) {
    this.parts = parts
    this.indented = indented
  }
  toString(): string {
    throw new Error("CodeFragment used in a plain string; interpolate it into CodeWriter.code")
  }
}

/**
 * Creates a writer for an empty module. `reserved` names are never given to
 * declarations or imports, for example globals the module uses.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const make = (options?: { readonly reserved?: Iterable<string> | undefined }): CodeWriter => {
  const writer = new WriterImpl()
  for (const name of options?.reserved ?? []) writer.taken.add(name)
  return writer
}

/**
 * Creates the symbol for `import * as name from "from"`.
 *
 * **Details**
 *
 * The symbol is not tied to a writer. When a writer prints code that uses it,
 * the import is printed with `name` as its local name, or `name` with a
 * numeric suffix when a declaration or another import has that name. A module
 * is imported as a namespace once; the first printed symbol picks the name.
 * The import is printed as `import type` when every printed use comes from a
 * symbol created with `typeOnly: true`.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importNamespace = (
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => new ImportImpl(from, "namespace", name, options?.typeOnly === true)

/**
 * Creates the symbol for `import { name } from "from"`. See
 * {@link importNamespace} for naming and type-only imports.
 *
 * **Details**
 *
 * Named imports of one module are printed in one statement. A specifier used
 * only as a type gets a `type` modifier, unless every specifier does, which
 * prints `import type { ... }`.
 *
 * **Example** (Type-only and value imports)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const Effect = CodeWriter.importNamespace("effect/Effect", "Effect", { typeOnly: true })
 * const some = CodeWriter.importNamed("effect/Option", "some")
 * const Option = CodeWriter.importNamed("effect/Option", "Option", { typeOnly: true })
 *
 * const writer = CodeWriter.make()
 * CodeWriter.add(writer, CodeWriter.code`export const one: ${Option}<number> = ${some}(1)`)
 * CodeWriter.add(writer, CodeWriter.code`export type Two = ${Effect}.Effect<number>`)
 *
 * CodeWriter.print(writer).split("\n").slice(0, 2) // => ['import type * as Effect from "effect/Effect"', 'import { type Option, some } from "effect/Option"']
 * ```
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importNamed = (
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => new ImportImpl(from, "named", name, options?.typeOnly === true)

/**
 * Creates the symbol for `import name from "from"`, where `name` is the local
 * name you want. A module has one default import; the first printed symbol
 * picks the name. See {@link importNamespace} for naming and type-only imports.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importDefault = (
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => new ImportImpl(from, "default", name, options?.typeOnly === true)

/**
 * Adds `import "from"` to a writer. It is always printed, because there is no
 * symbol to use.
 *
 * **Details**
 *
 * Side-effect imports are printed first, in the order they were added, because
 * their order can matter.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importSideEffect = (self: CodeWriter, from: string): void => {
  const writer = self as WriterImpl
  if (!writer.sideEffects.includes(from)) writer.sideEffects.push(from)
}

/**
 * Opens a nested scope of a writer or of another scope.
 *
 * **Gotchas**
 *
 * A name declared in a scope is taken for declarations made later in the
 * module and in enclosing scopes. Declare module names before local ones so
 * that module names keep the names you asked for.
 *
 * **Example** (Naming locals of two sibling functions)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const writer = CodeWriter.make()
 * const options = CodeWriter.declare(writer, "options")
 * const first = CodeWriter.scope(writer)
 * const second = CodeWriter.scope(writer)
 *
 * CodeWriter.declare(first, "options").name // => "options2"
 * CodeWriter.declare(first, "id").name // => "id"
 * CodeWriter.declare(second, "id").name // => "id"
 * options.name // => "options"
 * ```
 *
 * @stability unstable
 * @category scopes
 * @since 4.1.4
 */
export const scope = (parent: CodeWriter | CodeScope): CodeScope => {
  const owner = parent as WriterImpl | ScopeImpl
  const child = new ScopeImpl(owner)
  owner.children.push(child)
  return child
}

/** Whether `name` is taken by the owner, an enclosing scope or a nested scope. */
const isTakenFor = (owner: WriterImpl | ScopeImpl, name: string): boolean => {
  for (let s: WriterImpl | ScopeImpl = owner;; s = s.parent) {
    if (s.taken.has(name)) return true
    if (!(s instanceof ScopeImpl)) break
  }
  const stack = [...owner.children]
  while (stack.length > 0) {
    const child = stack.pop()!
    if (child.taken.has(name)) return true
    stack.push(...child.children)
  }
  return false
}

/**
 * Takes a name for a declaration of your own, in the module or in a nested
 * {@link CodeScope}, and returns its symbol.
 *
 * **Details**
 *
 * Characters that cannot appear in an identifier become `_`, and a name that
 * cannot start an identifier gets a `_` prefix. A name that is a reserved word
 * or already taken gets the first free numeric suffix: `"user-id"` becomes
 * `user_id`, and `"default"` becomes `default2`. Imports never take a
 * declaration's name; they are renamed instead.
 *
 * **Gotchas**
 *
 * The writer does not print the declaration or the `export` keyword; write
 * them in the source yourself.
 *
 * **Example** (Declarations keep their names)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const Schema = CodeWriter.importNamespace("effect/Schema", "Schema")
 *
 * const writer = CodeWriter.make()
 * const name = CodeWriter.declare(writer, "Schema")
 * CodeWriter.add(writer, CodeWriter.code`export const ${name} = ${Schema}.String`)
 *
 * CodeWriter.print(writer) // => 'import * as Schema2 from "effect/Schema"\n\nexport const Schema = Schema2.String\n'
 * ```
 *
 * @stability unstable
 * @category names
 * @since 4.1.4
 */
export const declare = (self: CodeWriter | CodeScope, name: string): CodeDeclaration => {
  const owner = self as WriterImpl | ScopeImpl
  const taken = freeName(sanitize(name), (n) => isTakenFor(owner, n))
  owner.taken.add(taken)
  return new DeclarationImpl(taken, owner instanceof ScopeImpl ? owner.writer : owner)
}

const flatten = (hole: CodeHole, out: Array<Part>): void => {
  if (hole === undefined || hole === null || hole === false || hole === "") return
  if (typeof hole === "string") out.push(hole)
  else if (typeof hole === "number") out.push(String(hole))
  else if (Array.isArray(hole)) { for (const h of hole) flatten(h, out) }
  else if (hole instanceof ImportImpl || hole instanceof DeclarationImpl || hole instanceof FragmentImpl) out.push(hole)
  else throw new Error("Unsupported value in CodeWriter.code")
}

/**
 * Builds a {@link CodeFragment} from a template.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const code = (strings: TemplateStringsArray, ...holes: ReadonlyArray<CodeHole>): CodeFragment => {
  const parts: Array<Part> = []
  strings.forEach((s, i) => {
    if (s !== "") parts.push(s)
    if (i < holes.length) flatten(holes[i], parts)
  })
  return new FragmentImpl(parts, false)
}

/**
 * Joins holes with a separator.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const join = (items: ReadonlyArray<CodeHole>, separator: string): CodeFragment => {
  const parts: Array<Part> = []
  items.forEach((item, i) => {
    if (i > 0) parts.push(separator)
    flatten(item, parts)
  })
  return new FragmentImpl(parts, false)
}

/**
 * Indents every non-empty line after the first by two more spaces.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const indent = (hole: CodeHole): CodeFragment => {
  const parts: Array<Part> = []
  flatten(hole, parts)
  return new FragmentImpl(parts, true)
}

/**
 * Appends source to the module, as a fragment or as plain text. Plain text
 * prints no imports.
 *
 * @stability unstable
 * @category mutations
 * @since 4.1.4
 */
export const add = (self: CodeWriter, source: string | CodeFragment): void => {
  ;(self as WriterImpl).body.push(source as string | FragmentImpl)
}

interface Line {
  readonly from: string
  readonly line: string
}

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Packages before relative modules, then by module (ignoring case), then by statement. */
const sortLines = (lines: Array<Line>): ReadonlyArray<string> =>
  lines.sort((a, b) =>
    Number(a.from.startsWith(".")) - Number(b.from.startsWith(".")) ||
    compareStrings(a.from.toLowerCase(), b.from.toLowerCase()) ||
    compareStrings(a.line, b.line)
  ).map((l) => l.line)

interface UsedImport {
  readonly symbol: ImportImpl
  runtime: boolean
  local: string
}

const printImports = (imports: Iterable<UsedImport>): ReadonlyArray<string> => {
  const lines: Array<Line> = []
  const named = new Map<string, Array<UsedImport>>()
  for (const used of imports) {
    const { from, style } = used.symbol
    const type = used.runtime ? "" : "type "
    if (style === "namespace") {
      lines.push({ from, line: `import ${type}* as ${used.local} from ${JSON.stringify(from)}` })
    } else if (style === "default") {
      lines.push({ from, line: `import ${type}${used.local} from ${JSON.stringify(from)}` })
    } else {
      const group = named.get(from)
      if (group === undefined) named.set(from, [used])
      else group.push(used)
    }
  }
  for (const [from, group] of named) {
    const allTypes = group.every((used) => !used.runtime)
    const specifiers = group
      .sort((a, b) => compareStrings(a.local, b.local))
      .map(({ local, runtime, symbol }) =>
        `${allTypes || runtime ? "" : "type "}${
          isIdentifierName(symbol.name) ? symbol.name : JSON.stringify(symbol.name)
        }${symbol.name === local ? "" : ` as ${local}`}`
      )
    lines.push({
      from,
      line: `import ${allTypes ? "type " : ""}{ ${specifiers.join(", ")} } from ${JSON.stringify(from)}`
    })
  }
  return sortLines(lines)
}

const collectImports = (writer: WriterImpl, parts: ReadonlyArray<Part>, out: Map<string, UsedImport>): void => {
  for (const part of parts) {
    if (part instanceof ImportImpl) {
      const used = out.get(part.key)
      if (used === undefined) out.set(part.key, { symbol: part, runtime: !part.typeOnly, local: "" })
      else used.runtime ||= !part.typeOnly
    } else if (part instanceof DeclarationImpl) {
      if (part.writer !== writer) {
        throw new Error(`Declaration "${part.name}" belongs to another CodeWriter; import it in this module instead`)
      }
    } else if (part instanceof FragmentImpl) collectImports(writer, part.parts, out)
  }
}

const allNames = (owner: WriterImpl | ScopeImpl, out: Set<string>): Set<string> => {
  for (const name of owner.taken) out.add(name)
  for (const child of owner.children) allNames(child, out)
  return out
}

const render = (
  part: string | FragmentImpl | ImportImpl | DeclarationImpl,
  imports: Map<string, UsedImport>
): string => {
  if (typeof part === "string") return part
  if (part instanceof ImportImpl) return imports.get(part.key)!.local
  if (part instanceof DeclarationImpl) return part.name
  let out = ""
  for (const p of part.parts) out += render(p, imports)
  return part.indented ? out.replace(/\n(?=[^\n])/g, "\n  ") : out
}

/**
 * Prints the module: side-effect imports and the imports used by printed code,
 * then the added source, separated by blank lines.
 *
 * **Details**
 *
 * Imports get their local names here, after every declaration: an import whose
 * name is taken anywhere in the module, including nested scopes, gets a
 * numeric suffix. Printing does not change the writer.
 *
 * **Example** (Printing a module)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const Effect = CodeWriter.importNamespace("effect/Effect", "Effect")
 *
 * const writer = CodeWriter.make()
 * CodeWriter.add(writer, CodeWriter.code`export const one = ${Effect}.succeed(1)`)
 *
 * CodeWriter.print(writer) // => 'import * as Effect from "effect/Effect"\n\nexport const one = Effect.succeed(1)\n'
 * ```
 *
 * @stability unstable
 * @category printing
 * @since 4.1.4
 */
export const print = (self: CodeWriter): string => {
  const writer = self as WriterImpl
  const imports = new Map<string, UsedImport>()
  for (const part of writer.body) {
    if (part instanceof FragmentImpl) collectImports(writer, [part], imports)
  }
  const taken = allNames(writer, new Set())
  for (const used of imports.values()) {
    used.local = freeName(sanitize(used.symbol.name), (name) => taken.has(name))
    taken.add(used.local)
  }
  const head = [
    ...writer.sideEffects.map((from) => `import ${JSON.stringify(from)}`),
    ...printImports(imports.values())
  ]
  const body = writer.body.map((part) => render(part, imports))
  return [head.join("\n"), ...body].filter((s) => s !== "").join("\n\n") + "\n"
}
