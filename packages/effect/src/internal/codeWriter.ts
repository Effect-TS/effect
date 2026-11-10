import type * as CodeWriter from "../CodeWriter.ts"

/** @internal */
export const TypeId = "~effect/CodeWriter"

/** @internal */
export const reservedWords: ReadonlySet<string> = new Set([
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
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
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
  "let",
  "static",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "await",
  "arguments",
  "eval",
  "any",
  "bigint",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "undefined",
  "unknown",
  "globalThis"
])

/** @internal */
export const sanitize = (name: string): string => {
  const out = name.replace(/[^A-Za-z0-9_$]/g, "_")
  return out === "" ? "_" : /^[0-9]/.test(out) ? `_${out}` : out
}

/** @internal */
export const identifier = (name: string): string => {
  const out = sanitize(name)
  return reservedWords.has(out) ? `${out}_` : out
}

/** @internal */
export interface ImportEntry {
  readonly from: string
  readonly style: "namespace" | "named" | "default"
  /** The imported name; for a default import, the requested local name. */
  readonly name: string
  readonly local: string
  /** Printed even when no printed fragment uses it (for plain-text source). */
  always: boolean
  /** Whether a plain-text use needs the value (fragments decide for themselves). */
  alwaysRuntime: boolean
}

/** @internal */
export interface ReexportEntry {
  readonly from: string
  /** The re-exported name; `undefined` for `export *`. */
  readonly name: string | undefined
  /** The requested export name. */
  readonly as: string | undefined
  /** The name it is exported as; `undefined` for a bare `export * from`. */
  readonly exported: string | undefined
  /** Printed as a type-only export when every request was type-only. */
  typeOnly: boolean
}

/** @internal */
export class CodeWriterImpl implements CodeWriter.CodeWriter {
  readonly [TypeId] = TypeId
  readonly taken = new Map<string, string>()
  readonly children: Array<ScopeImpl> = []
  readonly imports: Array<ImportEntry> = []
  readonly sideEffects: Array<string> = []
  readonly reexports: Array<ReexportEntry> = []
  readonly exportsList: Array<string> = []
  readonly body: Array<string | CodeFragmentImpl> = []
  readonly renamesList: Array<CodeWriter.Rename> = []
}

/** @internal */
export const ScopeTypeId = "~effect/CodeWriter/CodeScope"

/** @internal */
export class ScopeImpl implements CodeWriter.CodeScope {
  readonly [ScopeTypeId] = ScopeTypeId
  readonly taken = new Map<string, string>()
  readonly children: Array<ScopeImpl> = []
  readonly writer: CodeWriterImpl
  readonly parent: CodeWriterImpl | ScopeImpl
  constructor(parent: CodeWriterImpl | ScopeImpl) {
    this.parent = parent
    this.writer = parent instanceof ScopeImpl ? parent.writer : parent
  }
}

/** @internal */
export type Owner = CodeWriterImpl | ScopeImpl

/** @internal */
export const scope = (parent: Owner): ScopeImpl => {
  const child = new ScopeImpl(parent)
  parent.children.push(child)
  return child
}

/**
 * Who holds a name in the scope chain of `owner`: the owner itself, its ancestors (so a name never shadows an outer
 * one) and its descendants (so an inner name never shadows it). Sibling scopes may reuse names.
 */
const holder = (owner: Owner, name: string): string | undefined => {
  for (let s: Owner | undefined = owner; s !== undefined; s = s instanceof ScopeImpl ? s.parent : undefined) {
    const h = s.taken.get(name)
    if (h !== undefined) return h
  }
  const stack = [...owner.children]
  while (stack.length > 0) {
    const c = stack.pop()!
    const h = c.taken.get(name)
    if (h !== undefined) return h
    stack.push(...c.children)
  }
  return undefined
}

/** Takes a free name: `wanted`, or `wanted` with the first free numeric suffix (recorded as a rename). @internal */
export const take = (owner: Owner, wanted: string, label: string, record = true): string => {
  let name = wanted
  for (let n = 2; reservedWords.has(name) || holder(owner, name) !== undefined; n++) name = `${wanted}${n}`
  if (record && name !== wanted) {
    const writer = owner instanceof ScopeImpl ? owner.writer : owner
    writer.renamesList.push({ wanted, name, owner: label, takenBy: holder(owner, wanted) ?? "a reserved word" })
  }
  owner.taken.set(name, label)
  return name
}

/** @internal */
export const make = (options?: { readonly reserved?: Iterable<string> | undefined }): CodeWriterImpl => {
  const writer = new CodeWriterImpl()
  for (const name of options?.reserved ?? []) writer.taken.set(name, "a reserved name")
  return writer
}

/**
 * Finds or adds an import. `exact` keeps the requested local name (code that hard-codes it needs exactly that name)
 * and prints the import even without fragment uses.
 *
 * @internal
 */
export const importEntry = (
  writer: CodeWriterImpl,
  from: string,
  style: ImportEntry["style"],
  name: string,
  options?: { readonly exact?: boolean | undefined; readonly runtime?: boolean | undefined }
): ImportEntry => {
  const existing = writer.imports.find((i) =>
    i.from === from && i.style === style && (style === "default" || i.name === name)
  )
  if (existing !== undefined) {
    if (options?.exact === true) {
      existing.always = true
      existing.alwaysRuntime ||= options.runtime === true
    }
    return existing
  }
  let local: string
  if (options?.exact === true) {
    local = name
    writer.taken.set(name, `import "${from}"`)
  } else {
    local = take(writer, name, `import "${from}"`, false)
  }
  const entry: ImportEntry = {
    from,
    style,
    name,
    local,
    always: options?.exact === true,
    alwaysRuntime: options?.exact === true && options.runtime === true
  }
  writer.imports.push(entry)
  return entry
}

/** @internal */
export const importSideEffect = (writer: CodeWriterImpl, from: string): void => {
  if (!writer.sideEffects.includes(from)) writer.sideEffects.push(from)
}

/**
 * Finds or adds a re-export. `name` is `undefined` for `export *`. The exported name (`as`, else `name`) is taken in
 * the module like any other name; a bare `export * from` exports nothing it can name.
 *
 * @internal
 */
export const reexport = (
  writer: CodeWriterImpl,
  from: string,
  name: string | undefined,
  options?: { readonly as?: string | undefined; readonly typeOnly?: boolean | undefined }
): string | undefined => {
  const typeOnly = options?.typeOnly === true
  const existing = writer.reexports.find((e) => e.from === from && e.name === name && e.as === options?.as)
  if (existing !== undefined) {
    existing.typeOnly &&= typeOnly
    return existing.exported
  }
  const wanted = options?.as ?? name
  const exported = wanted === undefined ? undefined : take(writer, wanted, `export from "${from}"`)
  writer.reexports.push({ from, name, as: options?.as, exported, typeOnly })
  if (exported !== undefined) writer.exportsList.push(exported)
  return exported
}

// ---------------------------------------------------------------------------
// Symbols and fragments
// ---------------------------------------------------------------------------

/** @internal */
export class CodeSymbolImpl implements CodeWriter.CodeSymbol {
  readonly name: string
  /** The import this symbol stands for; `undefined` for a declaration of the module itself. */
  readonly entry: ImportEntry | undefined
  readonly typeOnly: boolean
  constructor(name: string, entry: ImportEntry | undefined, typeOnly: boolean) {
    this.name = name
    this.entry = entry
    this.typeOnly = typeOnly
  }
  toString(): string {
    throw new Error(`CodeSymbol ${this.name} used in a plain string; use CodeWriter.code so its import is registered`)
  }
}

type Part = string | CodeSymbolImpl | CodeFragmentImpl

/** @internal */
export class CodeFragmentImpl implements CodeWriter.CodeFragment {
  readonly parts: ReadonlyArray<Part>
  readonly indented: boolean
  constructor(parts: ReadonlyArray<Part>, indented: boolean) {
    this.parts = parts
    this.indented = indented
  }
  toString(): string {
    throw new Error("CodeFragment used in a plain string; interpolate it into CodeWriter.code instead")
  }
}

const flatten = (hole: CodeWriter.CodeHole, out: Array<Part>): void => {
  if (hole === undefined || hole === null || hole === false || hole === "") return
  if (typeof hole === "string") out.push(hole)
  else if (typeof hole === "number") out.push(String(hole))
  else if (Array.isArray(hole)) { for (const h of hole) flatten(h, out) }
  else if (hole instanceof CodeSymbolImpl || hole instanceof CodeFragmentImpl) out.push(hole)
  else throw new Error("Unsupported value in CodeWriter.code")
}

/** @internal */
export const code = (strings: TemplateStringsArray, ...holes: ReadonlyArray<CodeWriter.CodeHole>): CodeFragmentImpl => {
  const parts: Array<Part> = []
  strings.forEach((s, i) => {
    if (s !== "") parts.push(s)
    if (i < holes.length) flatten(holes[i], parts)
  })
  return new CodeFragmentImpl(parts, false)
}

/** @internal */
export const join = (items: ReadonlyArray<CodeWriter.CodeHole>, separator: string): CodeFragmentImpl => {
  const parts: Array<Part> = []
  items.forEach((item, i) => {
    if (i > 0) parts.push(separator)
    flatten(item, parts)
  })
  return new CodeFragmentImpl(parts, false)
}

/** @internal */
export const indent = (hole: CodeWriter.CodeHole): CodeFragmentImpl => {
  const parts: Array<Part> = []
  flatten(hole, parts)
  return new CodeFragmentImpl(parts, true)
}

const symbolUses = (parts: ReadonlyArray<unknown>, out: Map<ImportEntry, boolean>): void => {
  for (const part of parts) {
    if (part instanceof CodeSymbolImpl) {
      if (part.entry !== undefined) out.set(part.entry, (out.get(part.entry) ?? false) || !part.typeOnly)
    } else if (part instanceof CodeFragmentImpl) symbolUses(part.parts, out)
  }
}

const render = (part: Part, prefix: string): string => {
  if (typeof part === "string") return prefix === "" ? part : part.replace(/\n(?!\n)/g, `\n${prefix}`)
  if (part instanceof CodeSymbolImpl) return part.name
  const inner = part.indented ? `${prefix}  ` : prefix
  let out = ""
  for (const p of part.parts) out += render(p, inner)
  return out
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

interface Line {
  readonly from: string
  readonly line: string
}

const lower = (s: string) => s.toLowerCase()

/** Packages before relative modules, then by module (ignoring case), then by statement. */
const sortLines = (lines: Array<Line>): ReadonlyArray<string> =>
  lines.sort((a, b) =>
    Number(a.from.startsWith(".")) - Number(b.from.startsWith(".")) ||
    (lower(a.from) < lower(b.from) ? -1 : lower(a.from) > lower(b.from) ? 1 : 0) ||
    (a.line < b.line ? -1 : 1)
  ).map((l) => l.line)

/**
 * Prints `{ a, type b as c }` for one module: `typePrefix` is set when every specifier is type-only, so the statement
 * becomes `import type { ... }` / `export type { ... }` instead.
 */
const specifierList = (
  specifiers: ReadonlyArray<{ readonly name: string; readonly alias: string; readonly typeOnly: boolean }>
): { readonly typePrefix: boolean; readonly list: string } => {
  const typePrefix = specifiers.every((s) => s.typeOnly)
  const list = [...specifiers]
    .sort((a, b) => (a.alias < b.alias ? -1 : a.alias > b.alias ? 1 : 0))
    .map((s) => `${!typePrefix && s.typeOnly ? "type " : ""}${s.name}${s.name === s.alias ? "" : ` as ${s.alias}`}`)
    .join(", ")
  return { typePrefix, list: `{ ${list} }` }
}

const groupByModule = <A extends { readonly from: string }>(items: ReadonlyArray<A>): Map<string, Array<A>> => {
  const groups = new Map<string, Array<A>>()
  for (const item of items) {
    const group = groups.get(item.from)
    if (group === undefined) groups.set(item.from, [item])
    else group.push(item)
  }
  return groups
}

const printImports = (imports: ReadonlyArray<{ readonly entry: ImportEntry; readonly runtime: boolean }>): string => {
  const lines: Array<Line> = []
  const named: Array<{ from: string; name: string; alias: string; typeOnly: boolean }> = []
  for (const { entry: i, runtime } of imports) {
    const type = runtime ? "" : "type "
    if (i.style === "namespace") lines.push({ from: i.from, line: `import ${type}* as ${i.local} from "${i.from}"` })
    else if (i.style === "default") lines.push({ from: i.from, line: `import ${type}${i.local} from "${i.from}"` })
    else named.push({ from: i.from, name: i.name, alias: i.local, typeOnly: !runtime })
  }
  for (const [from, specifiers] of groupByModule(named)) {
    const { list, typePrefix } = specifierList(specifiers)
    lines.push({ from, line: `import ${typePrefix ? "type " : ""}${list} from "${from}"` })
  }
  return sortLines(lines).join("\n")
}

const printReexports = (reexports: ReadonlyArray<ReexportEntry>): string => {
  const lines: Array<Line> = []
  const named: Array<{ from: string; name: string; alias: string; typeOnly: boolean }> = []
  for (const e of reexports) {
    const type = e.typeOnly ? "type " : ""
    if (e.name === undefined) {
      const as = e.exported === undefined ? "" : ` as ${e.exported}`
      lines.push({ from: e.from, line: `export ${type}*${as} from "${e.from}"` })
    } else named.push({ from: e.from, name: e.name, alias: e.exported!, typeOnly: e.typeOnly })
  }
  for (const [from, specifiers] of groupByModule(named)) {
    const { list, typePrefix } = specifierList(specifiers)
    lines.push({ from, line: `export ${typePrefix ? "type " : ""}${list} from "${from}"` })
  }
  return sortLines(lines).join("\n")
}

/** @internal */
export const print = (writer: CodeWriterImpl): string => {
  const uses = new Map<ImportEntry, boolean>()
  symbolUses(writer.body, uses)
  const imports = writer.imports.flatMap((entry) => {
    const use = uses.get(entry)
    if (!entry.always && use === undefined) return []
    return [{ entry, runtime: entry.alwaysRuntime || use === true }]
  })
  const head = [...writer.sideEffects.map((from) => `import "${from}"`), printImports(imports)]
    .filter((s) => s !== "")
    .join("\n")
  const body = writer.body.map((part) => render(part, "")).filter((s) => s !== "")
  return [head, printReexports(writer.reexports), ...body].filter((s) => s !== "").join("\n\n") + "\n"
}
