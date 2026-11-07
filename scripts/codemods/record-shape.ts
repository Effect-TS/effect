import type * as cs from "jscodeshift"

/**
 * Rewrites a record service's name, used as the type of an implementation, to
 * its `Shape`: `fs: FileSystem.FileSystem` becomes `fs: FileSystem.Shape`,
 * while requirement positions keep the name: `Effect<_, _, FileSystem.FileSystem>`,
 * `Layer<FileSystem.FileSystem>`, `yield* FileSystem.FileSystem` and the key
 * argument of `Layer.succeed`, `Layer.effect`, `Layer.mock` and
 * `Effect.provideService` are unchanged. Value positions are never touched: the
 * value `FileSystem.FileSystem` is the key.
 *
 * The module is taken from the `module` option (default `FileSystem`); the same
 * transform serves `Terminal`. Imports are recognised as `import * as X from
 * "effect/<module>"`, `import { <module> } from "effect"` and `import * as X
 * from "effect"` followed by `X.<module>.<module>`, and a relative import of
 * the module's own file (`import * as X from "../<module>.ts"`), which is how
 * the repository imports it.
 *
 *   pnpm codemod:shape --module FileSystem packages/platform/node-shared/src
 */

/** Generic types whose type arguments are requirements, not implementations. */
const requirementCarriers = new Set(["Effect", "Layer", "Stream", "Sink", "Channel", "Context", "Return", "Services"])

export default function transformer(file: cs.FileInfo, api: cs.API, options: { readonly module?: string }) {
  const j = api.jscodeshift
  const module = options.module ?? "FileSystem"
  const root = j(file.source)

  // The local names the module is reachable under: `FileSystem` for `import * as FileSystem from "effect/FileSystem"`
  // or `import { FileSystem } from "effect"`; `Effect.FileSystem`-style access through a namespace import of "effect".
  const namespaces = new Set<string>()
  const roots = new Set<string>()
  // the module's own repository imports it by relative path: `import * as FileSystem from "../FileSystem.ts"`
  const isModuleSource = (source: unknown): boolean =>
    source === `effect/${module}` || (typeof source === "string" && /^\.\.?\//.test(source) &&
      (source.endsWith(`/${module}.ts`) || source.endsWith(`/${module}.js`) || source.endsWith(`/${module}`)))
  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.node.source.value
    for (const specifier of path.node.specifiers ?? []) {
      if (isModuleSource(source) && j.ImportNamespaceSpecifier.check(specifier)) {
        namespaces.add(specifier.local!.name)
      } else if (source === "effect" && j.ImportSpecifier.check(specifier) && specifier.imported.name === module) {
        namespaces.add(specifier.local?.name ?? module)
      } else if (source === "effect" && j.ImportNamespaceSpecifier.check(specifier)) {
        roots.add(specifier.local!.name)
      }
    }
  })
  if (namespaces.size === 0 && roots.size === 0) return undefined

  /** Whether a qualified type name is `<namespace>.<module>` or `<root>.<module>.<module>`. */
  const isRecordName = (name: cs.TSQualifiedName): boolean => {
    if (!j.Identifier.check(name.right) || name.right.name !== module) return false
    if (j.Identifier.check(name.left)) return namespaces.has(name.left.name)
    return j.TSQualifiedName.check(name.left) && j.Identifier.check(name.left.left) &&
      j.Identifier.check(name.left.right) && roots.has(name.left.left.name) && name.left.right.name === module
  }

  /** Whether the type reference sits in a requirement position: a type argument of a requirement-carrying generic. */
  const isRequirement = (path: cs.ASTPath<cs.TSTypeReference>): boolean => {
    let current: cs.ASTPath = path.parent
    while (
      current && (j.TSUnionType.check(current.node) || j.TSIntersectionType.check(current.node) ||
        j.TSParenthesizedType.check(current.node))
    ) current = current.parent
    if (!current || !j.TSTypeParameterInstantiation.check(current.node)) return false
    const reference = current.parent?.node
    if (!j.TSTypeReference.check(reference)) return false
    const name = reference.typeName
    const last = j.Identifier.check(name) ? name.name : j.TSQualifiedName.check(name) && j.Identifier.check(name.right)
      ? name.right.name
      : undefined
    return last !== undefined && requirementCarriers.has(last)
  }

  let changed = false
  root.find(j.TSTypeReference).forEach((path) => {
    const name = path.node.typeName
    if (!j.TSQualifiedName.check(name) || !isRecordName(name) || isRequirement(path)) return
    name.right = j.identifier("Shape")
    changed = true
  })
  return changed ? root.toSource() : undefined
}
