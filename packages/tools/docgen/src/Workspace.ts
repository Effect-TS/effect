/**
 * @since 0.6.0
 */

import type * as Workspace from "@effect/workspace/Workspace"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as NodePath from "node:path"
import * as Domain from "./Domain.ts"

/**
 * A publishable package and the public source files selected for documentation.
 *
 * @category model
 * @since 0.6.0
 */
export interface PackageSources {
  readonly name: string
  readonly path: string
  readonly root: string
  readonly files: ReadonlyArray<Domain.SourceFile>
}

/**
 * Workspace documentation source filters.
 *
 * @category model
 * @since 0.6.0
 */
export interface SourceFilters {
  readonly packages?: ReadonlyArray<string>
  readonly paths?: ReadonlyArray<string>
}

const packageSlug = (name: string): string => name.replace(/^@effect\//, "").replace(/^@/, "").replaceAll("/", "-")

/**
 * Selects package sources using case-insensitive package-slug and source-path filters.
 *
 * @category utilities
 * @since 0.6.0
 */
export const select = (
  packages: ReadonlyArray<PackageSources>,
  filters: SourceFilters
): Effect.Effect<ReadonlyArray<PackageSources>, Domain.DocgenError> => {
  const packageFilters = filters.packages?.map((filter) => filter.toLowerCase()) ?? []
  const pathFilters = filters.paths?.map((filter) => filter.toLowerCase()) ?? []
  if (packageFilters.length === 0 && pathFilters.length === 0) {
    return Effect.succeed(packages)
  }
  const selected = packages.flatMap((pkg) => {
    const slug = packageSlug(pkg.name).toLowerCase()
    if (packageFilters.length > 0 && !packageFilters.some((filter) => slug.includes(filter))) {
      return []
    }
    const files = pkg.files.filter((file) => {
      const sourcePath = file.sourcePath?.toLowerCase() ?? ""
      return pathFilters.length === 0 || pathFilters.some((filter) => sourcePath.includes(filter))
    })
    return files.length === 0 ? [] : [{ ...pkg, files }]
  })
  return selected.length === 0
    ? Effect.fail(new Domain.DocgenError({ message: "No documentation sources matched the supplied filters" }))
    : Effect.succeed(selected)
}

/**
 * Converts workspace package exports into docgen source inputs.
 *
 * @category utilities
 * @since 0.6.0
 */
export const fromAnalysis = (analysis: Workspace.WorkspaceAnalysis): Effect.Effect<
  ReadonlyArray<PackageSources>,
  Domain.DocgenError
> => {
  const errors: Array<string> = []
  const packageSlugs = new Map<string, string>()
  const packages = analysis.workspace.packages.map((pkg) => {
    const slug = packageSlug(pkg.name)
    const owner = packageSlugs.get(slug)
    if (owner !== undefined && owner !== pkg.name) {
      errors.push(`Packages '${owner}' and '${pkg.name}' produce duplicate documentation slug '${slug}'`)
    } else {
      packageSlugs.set(slug, pkg.name)
    }
    const sources = new Map<string, Set<string>>()
    for (const entry of pkg.distribution.exports) {
      for (const variant of entry.variants) {
        if (variant.kind !== "JavaScript") continue
        const provenance = variant.provenance
        if (provenance._tag === "Missing") {
          errors.push(
            `${pkg.name}: export '${entry.specifier}' has no source provenance for '${provenance.modulePath}'`
          )
        } else if (provenance._tag === "Ambiguous") {
          errors.push(
            `${pkg.name}: export '${entry.specifier}' has ambiguous source provenance for ` +
              `'${provenance.modulePath}': ${provenance.candidates.join(", ")}`
          )
        } else {
          const specifiers = sources.get(provenance.sourcePath)
          if (specifiers === undefined) {
            sources.set(provenance.sourcePath, new Set([entry.specifier]))
          } else {
            specifiers.add(entry.specifier)
          }
        }
      }
    }

    const files = globalThis.Array.from(sources, ([sourcePath, specifiers]) => {
      const modulePath = sourcePath.slice(pkg.path.length + 1).split("/")
      const publicSpecifiers = globalThis.Array.from(specifiers).sort()
      if (!Array.isArrayNonEmpty(modulePath) || !Array.isArrayNonEmpty(publicSpecifiers)) {
        throw new Error("workspace source paths and specifiers must be non-empty")
      }
      return new Domain.SourceFile(
        NodePath.resolve(analysis.root, sourcePath),
        modulePath,
        publicSpecifiers,
        sourcePath,
        pkg.name
      )
    }).sort((a, b) => a.path.localeCompare(b.path))

    return {
      name: pkg.name,
      path: pkg.path,
      root: NodePath.resolve(analysis.root, pkg.path),
      files
    }
  })

  return errors.length === 0
    ? Effect.succeed(packages)
    : Effect.fail(
      new Domain.DocgenError({
        message: `[Workspace.fromAnalysis] Invalid source provenance:\n${errors.join("\n")}`
      })
    )
}
