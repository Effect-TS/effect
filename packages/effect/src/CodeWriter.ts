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
 * names such as function parameters. {@link literal}, {@link propertyKey} and
 * {@link docComment} format values, object keys and JSDoc as source text.
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
 * nothing; use {@link literal} to print them as values.
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

const sanitize = (name: string): string => {
  const out = name.replace(/[^\p{ID_Continue}$\u200c\u200d]/gu, "_")
  return /^[\p{ID_Start}$_]/u.test(out) ? out : `_${out}`
}

const isIdentifierName = (name: string): boolean => sanitize(name) === name

/** Returns `wanted`, or `wanted` with the first numeric suffix that is free. */
const freeName = (wanted: string, isTaken: (name: string) => boolean): string => {
  let name = wanted
  for (let n = 2; reservedWords.has(name) || isTaken(name); n++) name = `${wanted}${n}`
  return name
}

class WriterImpl implements CodeWriter {
  readonly [TypeId] = TypeId
  readonly parent = undefined
  readonly writer: WriterImpl = this
  readonly reserved: ReadonlySet<string>
  readonly taken = new Set<string>()
  /** Names taken by nested scopes. */
  readonly nested = new Set<string>()
  readonly sideEffects = new Set<string>()
  readonly body: Array<string | FragmentImpl> = []
  constructor(reserved: Iterable<string>) {
    this.reserved = new Set(reserved)
  }
}

class ScopeImpl implements CodeScope {
  readonly [ScopeTypeId] = ScopeTypeId
  readonly parent: Owner
  readonly writer: WriterImpl
  readonly taken = new Set<string>()
  /** Names taken by nested scopes. */
  readonly nested = new Set<string>()
  constructor(parent: Owner) {
    this.parent = parent
    this.writer = parent.writer
  }
}

type Owner = WriterImpl | ScopeImpl

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
export const make = (options?: { readonly reserved?: Iterable<string> | undefined }): CodeWriter =>
  new WriterImpl(options?.reserved ?? [])

/**
 * Creates the symbol for `import * as name from "from"`.
 *
 * **Details**
 *
 * When a writer prints code that uses the symbol, the import is printed with
 * `name` as its local name, or `name` with a numeric suffix when a declaration
 * or another import has that name. A module is imported as a namespace once;
 * the first printed symbol picks the name. The import is printed as
 * `import type` when every printed use comes from a symbol created with
 * `typeOnly: true`.
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
 * Side-effect imports are printed first, in the order they were added.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importSideEffect = (self: CodeWriter, from: string): void => {
  ;(self as WriterImpl).sideEffects.add(from)
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
export const scope = (parent: CodeWriter | CodeScope): CodeScope => new ScopeImpl(parent as Owner)

/** Why `name` is taken for `owner`, or `undefined` when it is free. */
const takenBy = (owner: Owner, name: string): string | undefined => {
  if (owner.writer.reserved.has(name)) return "it is reserved by CodeWriter.make"
  if (owner.nested.has(name)) return "a nested scope declares it"
  for (let s: Owner | undefined = owner; s !== undefined; s = s.parent) {
    if (s.taken.has(name)) return s === owner ? "this scope declares it" : "an enclosing scope declares it"
  }
  return undefined
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
 * `user_id`, and `"default"` becomes `default2`.
 *
 * With `exact: true` the declaration gets exactly `name`, which suits names
 * that are part of the generated module's API. If `name` is not an identifier,
 * is a reserved word, is reserved by {@link make}, or is declared in the scope
 * chain (including nested scopes), `declare` throws an error that says which,
 * and takes no name.
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
 * **Example** (Exact names)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const writer = CodeWriter.make({ reserved: ["Client"] })
 * CodeWriter.declare(writer, "User", { exact: true }).name // => "User"
 *
 * try {
 *   CodeWriter.declare(writer, "Client", { exact: true })
 * } catch (error) {
 *   String(error) // => 'Error: Cannot declare "Client": it is reserved by CodeWriter.make'
 * }
 * ```
 *
 * @stability unstable
 * @category names
 * @since 4.1.4
 */
export const declare = (
  self: CodeWriter | CodeScope,
  name: string,
  options?: { readonly exact?: boolean | undefined }
): CodeDeclaration => {
  const owner = self as Owner
  let taken = name
  if (options?.exact === true) {
    const reason = !isIdentifierName(name)
      ? "it is not an identifier"
      : reservedWords.has(name)
      ? "it is a reserved word"
      : takenBy(owner, name)
    if (reason !== undefined) throw new Error(`Cannot declare ${JSON.stringify(name)}: ${reason}`)
  } else {
    taken = freeName(sanitize(name), (n) => takenBy(owner, n) !== undefined)
  }
  owner.taken.add(taken)
  for (let s: Owner | undefined = owner.parent; s !== undefined; s = s.parent) s.nested.add(taken)
  return new DeclarationImpl(taken, owner.writer)
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
    flatten(s, parts)
    flatten(holes[i], parts)
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

/**
 * Formats a value as a TypeScript literal.
 *
 * **Details**
 *
 * Strings are quoted and escaped, bigints get an `n` suffix, and `-0` keeps
 * its sign. `NaN` and the infinities are printed as `globalThis.NaN` and
 * `globalThis.Infinity`, which no declaration can shadow.
 *
 * **Example** (Formatting literals)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * CodeWriter.literal('say "hi"') // => '"say \\"hi\\""'
 * CodeWriter.literal(123n) // => "123n"
 * CodeWriter.literal(false) // => "false"
 * CodeWriter.literal(-Infinity) // => "-globalThis.Infinity"
 * ```
 *
 * @stability unstable
 * @category formatting
 * @since 4.1.4
 */
export const literal = (value: string | number | bigint | boolean | null | undefined): string => {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value)
    case "bigint":
      return `${value}n`
    case "number":
      if (Number.isNaN(value)) return "globalThis.NaN"
      if (!Number.isFinite(value)) return value > 0 ? "globalThis.Infinity" : "-globalThis.Infinity"
      return Object.is(value, -0) ? "-0" : String(value)
    default:
      return String(value)
  }
}

/**
 * Formats a string as a key of an object literal or a type member.
 *
 * **Details**
 *
 * An identifier name, including a reserved word, is printed as it is, and any
 * other key is quoted. `__proto__` becomes `["__proto__"]`, so that an object
 * literal defines a property instead of setting its prototype.
 *
 * **Example** (Formatting property keys)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * CodeWriter.propertyKey("default") // => "default"
 * CodeWriter.propertyKey("user-id") // => '"user-id"'
 * CodeWriter.propertyKey("__proto__") // => '["__proto__"]'
 * ```
 *
 * @stability unstable
 * @category formatting
 * @since 4.1.4
 */
export const propertyKey = (key: string): string =>
  key === "__proto__" ? `["__proto__"]` : isIdentifierName(key) ? key : JSON.stringify(key)

/**
 * Formats text as a JSDoc comment, followed by a newline.
 *
 * **Details**
 *
 * The text, or each string of an array, is split into lines. Trailing
 * whitespace and leading and trailing blank lines are removed, and `*\/` is
 * escaped. One line prints as `/** text *\/`. Text with no non-blank line
 * gives an empty string. The comment can be put inside {@link indent}.
 *
 * **Example** (Documenting a declaration)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * CodeWriter.docComment("The user id.") // => "/** The user id. *\/\n"
 * CodeWriter.docComment(["A user.", "", "@since 1.0.0"]) // => "/**\n * A user.\n *\n * @since 1.0.0\n *\/\n"
 * ```
 *
 * @stability unstable
 * @category formatting
 * @since 4.1.4
 */
export const docComment = (text: string | ReadonlyArray<string>): string => {
  const lines = (typeof text === "string" ? [text] : text)
    .flatMap((t) => t.split(/\r\n?|\n/))
    .map((line) => line.trimEnd().replaceAll("*/", "*\\/"))
  const start = lines.findIndex((line) => line !== "")
  if (start === -1) return ""
  let end = lines.length
  while (lines[end - 1] === "") end--
  const body = lines.slice(start, end)
  if (body.length === 1) return `/** ${body[0]} */\n`
  return `/**\n${body.map((line) => (line === "" ? " *" : ` * ${line}`)).join("\n")}\n */\n`
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
  readonly local: string
  runtime: boolean
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
  const taken = new Set([...writer.reserved, ...writer.taken, ...writer.nested])
  const imports = new Map<string, UsedImport>()
  const render = (part: Part): string => {
    if (typeof part === "string") return part
    if (part instanceof DeclarationImpl) {
      if (part.writer !== writer) {
        throw new Error(`Declaration "${part.name}" belongs to another CodeWriter; import it in this module instead`)
      }
      return part.name
    }
    if (part instanceof ImportImpl) {
      let used = imports.get(part.key)
      if (used === undefined) {
        used = { symbol: part, local: freeName(sanitize(part.name), (name) => taken.has(name)), runtime: false }
        taken.add(used.local)
        imports.set(part.key, used)
      }
      used.runtime ||= !part.typeOnly
      return used.local
    }
    const out = part.parts.map(render).join("")
    return part.indented ? out.replace(/\n(?=[^\n])/g, "\n  ") : out
  }
  const body = writer.body.map(render)
  const head = [
    ...Array.from(writer.sideEffects, (from) => `import ${JSON.stringify(from)}`),
    ...printImports(imports.values())
  ]
  return [head.join("\n"), ...body].filter((s) => s !== "").join("\n\n") + "\n"
}
