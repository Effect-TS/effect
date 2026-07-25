/**
 * @since 0.6.0
 */

import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import type * as Domain from "./Domain.ts"
import * as Parser from "./Parser.ts"

/**
 * @category models
 * @since 0.6.0
 */
export type DeclarationKind =
  | "module"
  | "namespace"
  | "class"
  | "staticMethod"
  | "instanceMethod"
  | "interface"
  | "typeAlias"
  | "constant"
  | "function"
  | "export"

/**
 * @category models
 * @since 0.6.0
 */
export interface Example {
  readonly source: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declarationPathname: string
  readonly modulePath: ReadonlyArray<string>
  readonly declarationPath: ReadonlyArray<string>
  readonly declarationKind: DeclarationKind
  readonly index: number
  readonly name: string
}

/**
 * @category models
 * @since 0.6.0
 */
export interface Package {
  readonly name: string
  readonly root: string
  readonly modules: ReadonlyArray<Domain.Module>
}

/**
 * Output-format-independent documentation for selected source files.
 *
 * @category models
 * @since 0.6.0
 */
export interface SemanticModel {
  readonly frontend: "source" | "declaration"
  readonly packages: ReadonlyArray<Package>
  readonly modules: ReadonlyArray<Domain.Module>
  readonly examples: ReadonlyArray<Example>
  readonly diagnostics: ReadonlyArray<string>
}

/** @internal */
export const SKIP_TYPE_CHECKING_FENCE_METADATA = "skip-type-checking"

/** @internal */
export const extractFencedCode = (content: string): [examples: Array<string>, warnings: Array<string>] => {
  const fenceRegex = /(?:```|~~~)(.*?)\n([\s\S]*?)(?:(```|~~~)|$)/g
  const matches = Array.fromIterable(content.matchAll(fenceRegex))
  const warnings: Array<string> = []
  for (const match of matches) {
    if (match[3] === undefined) warnings.push(`Code block does not have a matching closing fence:\n${content}`)
  }
  return [
    matches.filter((match) => {
      const meta = match[1].toLocaleLowerCase()
      return (meta.startsWith("ts") || meta.startsWith("typescript")) &&
        !meta.includes(SKIP_TYPE_CHECKING_FENCE_METADATA)
    }).map((match) => match[2].trim()),
    warnings
  ]
}

const sourceName = (module: Domain.Module): string => module.name.replace(/\.[cm]?tsx?$/, "")

const displayDeclaration = (module: Domain.Module, kind: DeclarationKind, path: ReadonlyArray<string>): string => {
  if (kind === "module") return sourceName(module)
  if (kind === "staticMethod") return `${path[0]}.static.${path.slice(1).join(".")}`
  return path.join(".")
}

const examplesFor = (
  module: Domain.Module,
  kind: DeclarationKind,
  declarationPath: ReadonlyArray<string>,
  doc: Domain.Doc,
  diagnostics: Array<string>
): ReadonlyArray<Example> => {
  let snippets: Array<string> = []
  const contents = doc.description === undefined ? doc.examples : [doc.description, ...doc.examples]
  for (const content of contents) {
    const [examples, warnings] = extractFencedCode(content)
    snippets = snippets.concat(examples)
    diagnostics.push(...warnings)
  }
  const configPackageName = module.source.packageName
  const packageName = configPackageName ?? ""
  const declaration = displayDeclaration(module, kind, declarationPath)
  const moduleName = sourceName(module) === declaration ? sourceName(module) : `${sourceName(module)}.${declaration}`
  return snippets.map((source, index) => ({
    source,
    packageName,
    sourcePath: module.source.sourcePath ?? module.path.join("/"),
    declarationPathname: module.source.filePath,
    modulePath: module.path,
    declarationPath,
    declarationKind: kind,
    index: index + 1,
    name: `${packageName}/${moduleName} example ${index + 1}`
  }))
}

const namespaceExamples = (
  module: Domain.Module,
  namespace: Domain.Namespace,
  path: ReadonlyArray<string>,
  diagnostics: Array<string>
): ReadonlyArray<Example> => {
  const declarationPath = [...path, namespace.name]
  return [
    ...examplesFor(module, "namespace", declarationPath, namespace.doc, diagnostics),
    ...namespace.interfaces.flatMap((entry) =>
      examplesFor(module, "interface", [...declarationPath, entry.name], entry.doc, diagnostics)
    ),
    ...namespace.typeAliases.flatMap((entry) =>
      examplesFor(module, "typeAlias", [...declarationPath, entry.name], entry.doc, diagnostics)
    ),
    ...namespace.namespaces.flatMap((entry) => namespaceExamples(module, entry, declarationPath, diagnostics))
  ]
}

const extractExamples = (
  modules: ReadonlyArray<Domain.Module>
): { readonly examples: ReadonlyArray<Example>; readonly diagnostics: ReadonlyArray<string> } => {
  const diagnostics: Array<string> = []
  const examples = modules.flatMap((module) => {
    return [
      ...examplesFor(module, "module", [sourceName(module)], module.doc, diagnostics),
      ...module.classes.flatMap((entry) => [
        ...examplesFor(module, "class", [entry.name], entry.doc, diagnostics),
        ...entry.methods.flatMap((method) =>
          examplesFor(module, "instanceMethod", [entry.name, method.name], method.doc, diagnostics)
        ),
        ...entry.staticMethods.flatMap((method) =>
          examplesFor(module, "staticMethod", [entry.name, method.name], method.doc, diagnostics)
        )
      ]),
      ...module.interfaces.flatMap((entry) => examplesFor(module, "interface", [entry.name], entry.doc, diagnostics)),
      ...module.typeAliases.flatMap((entry) => examplesFor(module, "typeAlias", [entry.name], entry.doc, diagnostics)),
      ...module.constants.flatMap((entry) => examplesFor(module, "constant", [entry.name], entry.doc, diagnostics)),
      ...module.functions.flatMap((entry) => examplesFor(module, "function", [entry.name], entry.doc, diagnostics)),
      ...module.exports.flatMap((entry) => examplesFor(module, "export", [entry.name], entry.doc, diagnostics)),
      ...module.namespaces.flatMap((entry) => namespaceExamples(module, entry, [], diagnostics))
    ]
  })
  return { examples, diagnostics }
}

/**
 * Builds the semantic model from selected source files using the canonical parser.
 *
 * @category constructors
 * @since 0.6.0
 */
export const fromFiles = Effect.fnUntraced(function*(
  files: ReadonlyArray<Domain.SourceFile>,
  packages: ReadonlyArray<{ readonly name: string; readonly root: string }>,
  frontend: "source" | "declaration"
) {
  const modules = yield* Parser.parseFiles(files)
  const packageNames = new Set(packages.map((pkg) => pkg.name))
  const unmapped = modules.filter((module) =>
    module.source.packageName === undefined || !packageNames.has(module.source.packageName)
  )
  if (unmapped.length > 0) {
    const errors: Array<Array<string>> = unmapped.map((module) => [
      `Source '${module.source.filePath}' does not belong to a semantic package`
    ])
    return yield* Effect.fail(errors)
  }
  const extracted = extractExamples(modules)
  return {
    frontend,
    modules,
    examples: extracted.examples,
    diagnostics: extracted.diagnostics,
    packages: packages.map((pkg) => ({
      ...pkg,
      modules: modules.filter((module) => module.source.packageName === pkg.name)
    }))
  } satisfies SemanticModel
})

/**
 * Builds source documentation with the canonical parser.
 *
 * @category constructors
 * @since 0.6.0
 */
export const fromSourceFiles = (
  files: ReadonlyArray<Domain.SourceFile>,
  packages: ReadonlyArray<{ readonly name: string; readonly root: string }>
) => fromFiles(files, packages, "source")
