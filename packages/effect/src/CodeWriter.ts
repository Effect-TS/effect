/**
 * Build TypeScript modules for code generators.
 *
 * A `CodeWriter` collects source text and the imports it needs, and keeps the
 * module's names from clashing. Code is written with the {@link code} template:
 * imports are {@link CodeSymbol}s interpolated into it, and an import is only
 * printed when a printed fragment uses it. Names for your own declarations come
 * from {@link declare}, which avoids every name already taken in the module.
 * Nested {@link scope}s hold local declarations, such as function parameters.
 * Re-exports ({@link reexport}, {@link reexportAll}) are printed after the
 * imports, and {@link exportedNames} lists every name the module exports.
 *
 * @stability unstable
 * @since 4.1.4
 */
import * as internal from "./internal/codeWriter.ts"

/**
 * Writes one TypeScript module.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeWriter {
  readonly "~effect/CodeWriter": "~effect/CodeWriter"
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
  readonly "~effect/CodeWriter/CodeScope": "~effect/CodeWriter/CodeScope"
}

/**
 * A name in a {@link CodeWriter}: an import (from {@link importNamespace},
 * {@link importNamed} or {@link importDefault}) or a declaration (from
 * {@link declare}).
 * Its name is fixed when it is created. An import is printed only if a printed
 * fragment contains its symbol.
 *
 * **Gotchas**
 *
 * Interpolate symbols only into the {@link code} template. Converting one to a
 * string throws, so an import can never go missing silently.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeSymbol {
  readonly name: string
}

/**
 * Source text built with the {@link code} template. It keeps the symbols it
 * contains, so their imports are registered when it is printed.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface CodeFragment {
  readonly parts: ReadonlyArray<string | CodeSymbol | CodeFragment>
}

/**
 * What can be interpolated into a {@link code} template: text, numbers,
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

/**
 * A name that could not be used because it was taken, and the name used
 * instead.
 *
 * @stability unstable
 * @category models
 * @since 4.1.4
 */
export interface Rename {
  readonly wanted: string
  readonly name: string
  readonly owner: string
  readonly takenBy: string
}

/**
 * Creates a writer for an empty module. `reserved` names are never given to
 * anything in it.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const make: (options?: { readonly reserved?: Iterable<string> | undefined }) => CodeWriter = internal.make

const symbolOf = (entry: internal.ImportEntry, options?: { readonly typeOnly?: boolean | undefined }): CodeSymbol =>
  new internal.CodeSymbolImpl(entry.local, entry, options?.typeOnly === true)

/**
 * Requests `import * as name from "from"` and returns its symbol.
 *
 * **Details**
 *
 * The local name is `name`, suffixed when something in the module already has
 * it; requesting the same import twice gives the same name. The import is
 * printed only if a printed fragment uses the symbol, and as `import type` when
 * every printed use was requested with `typeOnly: true`.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importNamespace = (
  self: CodeWriter,
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => symbolOf(internal.importEntry(self as internal.CodeWriterImpl, from, "namespace", name), options)

/**
 * Requests `import { name } from "from"` and returns its symbol. See
 * {@link importNamespace} for naming and printing.
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
 * const writer = CodeWriter.make()
 * const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect", { typeOnly: true })
 * const some = CodeWriter.importNamed(writer, "effect/Option", "some")
 * const Option = CodeWriter.importNamed(writer, "effect/Option", "Option", { typeOnly: true })
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
  self: CodeWriter,
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => symbolOf(internal.importEntry(self as internal.CodeWriterImpl, from, "named", name), options)

/**
 * Requests `import name from "from"` and returns its symbol. `name` is the
 * local name you want; a module has one default import, so requesting it again
 * gives the first symbol's name. See {@link importNamespace} for naming and
 * printing.
 *
 * @stability unstable
 * @category imports
 * @since 4.1.4
 */
export const importDefault = (
  self: CodeWriter,
  from: string,
  name: string,
  options?: { readonly typeOnly?: boolean | undefined }
): CodeSymbol => symbolOf(internal.importEntry(self as internal.CodeWriterImpl, from, "default", name), options)

/**
 * Adds `import "from"`, which is always printed: there is no symbol to use.
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
export const importSideEffect = (self: CodeWriter, from: string): void =>
  internal.importSideEffect(self as internal.CodeWriterImpl, from)

/**
 * Adds `export { name } from "from"`, or `export { name as as } from "from"`,
 * and returns the exported name. It is always printed.
 *
 * **Details**
 *
 * The exported name is taken in the module like any other name, so it is
 * suffixed (and reported in {@link renames}) when it is taken. Re-exports of
 * one module are printed in one statement, with `type` modifiers as for
 * {@link importNamed}. Re-exporting the same name twice gives the same
 * exported name, and is type-only only if both requests were.
 *
 * **Example** (A barrel module)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const writer = CodeWriter.make()
 * CodeWriter.reexport(writer, "./User.ts", "User")
 * CodeWriter.reexport(writer, "./User.ts", "UserId", { typeOnly: true })
 * CodeWriter.reexportAll(writer, "./Order.ts", { as: "Order" })
 *
 * CodeWriter.print(writer) // => 'export * as Order from "./Order.ts"\nexport { User, type UserId } from "./User.ts"\n'
 * CodeWriter.exportedNames(writer) // => ["User", "UserId", "Order"]
 * ```
 *
 * @stability unstable
 * @category exports
 * @since 4.1.4
 */
export const reexport = (
  self: CodeWriter,
  from: string,
  name: string,
  options?: { readonly as?: string | undefined; readonly typeOnly?: boolean | undefined }
): string => internal.reexport(self as internal.CodeWriterImpl, from, name, options)!

/**
 * Adds `export * from "from"`, or `export * as as from "from"` and returns the
 * exported name. It is always printed.
 *
 * **Gotchas**
 *
 * The names a bare `export *` brings in are unknown to the writer: they are
 * neither in {@link exportedNames} nor checked for clashes.
 *
 * @stability unstable
 * @category exports
 * @since 4.1.4
 */
export const reexportAll: {
  (self: CodeWriter, from: string, options: { readonly as: string; readonly typeOnly?: boolean | undefined }): string
  (self: CodeWriter, from: string, options?: { readonly typeOnly?: boolean | undefined }): undefined
} =
  ((self: CodeWriter, from: string, options?: { readonly as?: string; readonly typeOnly?: boolean | undefined }) =>
    internal.reexport(self as internal.CodeWriterImpl, from, undefined, options)) as any

/**
 * Opens a nested scope of a writer or of another scope.
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
export const scope = (parent: CodeWriter | CodeScope): CodeScope => internal.scope(parent as internal.Owner)

/**
 * Takes a name for a declaration of your own, in the module or in a nested
 * {@link CodeScope}, and returns its symbol. The name is suffixed when it is
 * taken; every suffix is recorded in {@link renames}.
 *
 * **Details**
 *
 * Interpolate the symbol into {@link code} like an import; its `name` is the
 * final name. `exported: true` lists a module declaration in {@link exportedNames}.
 *
 * **Gotchas**
 *
 * The writer does not print the `export` keyword: write it in the declaration's
 * source yourself.
 *
 * @stability unstable
 * @category names
 * @since 4.1.4
 */
export const declare: {
  (self: CodeWriter, name: string, options?: { readonly exported?: boolean | undefined }): CodeSymbol
  (self: CodeWriter | CodeScope, name: string): CodeSymbol
} = (self: CodeWriter | CodeScope, name: string, options?: { readonly exported?: boolean | undefined }) => {
  const isScope = self instanceof internal.ScopeImpl
  const taken = internal.take(self as internal.Owner, name, isScope ? "a scope" : "the module")
  if (!isScope && options?.exported === true) (self as internal.CodeWriterImpl).exportsList.push(taken)
  return new internal.CodeSymbolImpl(taken, undefined, false)
}

/**
 * Turns any name into a valid local identifier without reserving it: invalid
 * characters become `_`, a leading digit gets a `_` prefix, and reserved words
 * get a `_` suffix. Use it for function parameters named after generator input.
 *
 * **Example** (Naming a parameter after input)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * CodeWriter.identifier("default") // => "default_"
 * CodeWriter.identifier("user-id") // => "user_id"
 * ```
 *
 * @stability unstable
 * @category names
 * @since 4.1.4
 */
export const identifier: (name: string) => string = internal.identifier

/**
 * Builds a {@link CodeFragment} from a template.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const code: (strings: TemplateStringsArray, ...holes: ReadonlyArray<CodeHole>) => CodeFragment = internal.code

/**
 * Joins holes with a separator.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const join: (items: ReadonlyArray<CodeHole>, separator: string) => CodeFragment = internal.join

/**
 * Indents every line after the first by two more spaces.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.4
 */
export const indent: (hole: CodeHole) => CodeFragment = internal.indent

/**
 * Appends source to the module, as a fragment or as plain text. Plain text
 * registers no imports.
 *
 * @stability unstable
 * @category mutations
 * @since 4.1.4
 */
export const add = (self: CodeWriter, source: string | CodeFragment): void => {
  ;(self as internal.CodeWriterImpl).body.push(source as string | internal.CodeFragmentImpl)
}

/**
 * Every name that had to change because it was taken.
 *
 * @stability unstable
 * @category getters
 * @since 4.1.4
 */
export const renames = (self: CodeWriter): ReadonlyArray<Rename> => (self as internal.CodeWriterImpl).renamesList

/**
 * Every name the module exports: declarations made with `exported: true`, and
 * re-exported names, in the order they were added.
 *
 * @stability unstable
 * @category getters
 * @since 4.1.4
 */
export const exportedNames = (self: CodeWriter): ReadonlyArray<string> => (self as internal.CodeWriterImpl).exportsList

/**
 * Prints the module: side-effect imports and the imports used by printed code,
 * then re-exports, then the added source, separated by blank lines.
 *
 * **Example** (Imports appear only when used)
 *
 * ```ts import.meta.vitest
 * import { CodeWriter } from "effect"
 *
 * const writer = CodeWriter.make()
 * const Effect = CodeWriter.importNamespace(writer, "effect/Effect", "Effect")
 * CodeWriter.importNamespace(writer, "effect/Stream", "Stream")
 * CodeWriter.add(writer, CodeWriter.code`export const one = ${Effect}.succeed(1)`)
 *
 * CodeWriter.print(writer) // => 'import * as Effect from "effect/Effect"\n\nexport const one = Effect.succeed(1)\n'
 * ```
 *
 * @stability unstable
 * @category printing
 * @since 4.1.4
 */
export const print = (self: CodeWriter): string => internal.print(self as internal.CodeWriterImpl)
