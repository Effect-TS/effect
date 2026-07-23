import * as Schema from "effect/Schema"
import type { ApiMapping, ApiSnapshot, ApiTarget, MappingDiagnostic, ModuleMapping } from "./Model.ts"
import { MigrationMap } from "./Model.ts"

export const decodeMigrationMap = Schema.decodeUnknownEffect(Schema.fromJsonString(MigrationMap))

const targetKey = (target: ApiTarget): string => `${target.module}#${target.path.join(".")}#${target.bucket ?? "*"}`

const entityMatchesTarget = (snapshot: ApiSnapshot, target: ApiTarget): number =>
  snapshot.entities.filter((entity) =>
    entity.module === target.module &&
    entity.path.join(".") === target.path.join(".") &&
    (target.bucket === undefined || entity.bucket === target.bucket)
  ).length

const linkedGuideMappings = (
  guideSources: ReadonlyMap<string, string>,
  mapping: ApiMapping
): ReadonlyArray<string> => {
  if (mapping.guide === undefined || !guideSources.has(mapping.guide)) {
    return []
  }
  const source = guideSources.get(mapping.guide)!
  const fromName = mapping.from.path.at(-1)
  if (fromName === undefined) {
    return []
  }
  const results: Array<string> = []
  const escaped = fromName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  for (const match of source.matchAll(new RegExp(`\\b${escaped}\\b[^\\n|→]*?(?:→|\\|)\\s*\`?([A-Za-z][\\w.]*)`, "g"))) {
    if (match[1] !== undefined) {
      results.push(match[1])
    }
  }
  return results
}

export interface ValidateMappingOptions {
  readonly base?: ApiSnapshot
  readonly head?: ApiSnapshot
  readonly guideSources?: ReadonlyMap<string, string>
}

export const validateMigrationMap = (
  mapping: MigrationMap,
  options: ValidateMappingOptions = {}
): ReadonlyArray<MappingDiagnostic> => {
  const diagnostics: Array<MappingDiagnostic> = []
  const moduleSources = new Map<string, ModuleMapping>()
  for (const entry of mapping.modules) {
    if (entry.from !== undefined) {
      const previous = moduleSources.get(entry.from)
      if (previous !== undefined) {
        diagnostics.push({
          severity: "error",
          code: "duplicate-module-source",
          message: `Duplicate module source ${entry.from}`
        })
      } else {
        moduleSources.set(entry.from, entry)
      }
    }
    if (entry.status === "removed" && entry.to.length !== 0) {
      diagnostics.push({
        severity: "error",
        code: "contradictory-module-status",
        message: `Removed module ${entry.from ?? "<added>"} has targets`
      })
    }
    if (entry.status !== "removed" && entry.status !== "added" && entry.to.length === 0) {
      diagnostics.push({
        severity: "error",
        code: "missing-module-target",
        message: `Module ${entry.from ?? "<added>"} has no target`
      })
    }
  }

  const apiSources = new Set<string>()
  for (const entry of mapping.apis) {
    const key = targetKey(entry.from)
    if (apiSources.has(key)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-api-source",
        message: `Duplicate API source ${key}`
      })
    }
    apiSources.add(key)
    if (options.base !== undefined) {
      const count = entityMatchesTarget(options.base, entry.from)
      if (count === 0) {
        diagnostics.push({
          severity: "error",
          code: "missing-api-source",
          message: `Mapped API source does not resolve: ${key}`
        })
      } else if (count > 1 && entry.from.bucket === undefined) {
        diagnostics.push({
          severity: "error",
          code: "ambiguous-api-source",
          message: `Mapped API source resolves to ${count} facets; specify a bucket: ${key}`
        })
      }
    }
    if (options.head !== undefined && entry.to !== null) {
      const count = entityMatchesTarget(options.head, entry.to)
      if (count === 0) {
        diagnostics.push({
          severity: "error",
          code: "missing-api-target",
          message: `Mapped API target does not resolve: ${targetKey(entry.to)}`
        })
      } else if (count > 1 && entry.to.bucket === undefined) {
        diagnostics.push({
          severity: "error",
          code: "ambiguous-api-target",
          message: `Mapped API target resolves to ${count} facets; specify a bucket: ${targetKey(entry.to)}`
        })
      }
    }
    if (options.guideSources !== undefined && entry.to !== null) {
      const documented = linkedGuideMappings(options.guideSources, entry)
      const expected = entry.to.path.join(".")
      for (const actual of documented) {
        if (actual !== expected && !actual.endsWith(`.${expected}`)) {
          diagnostics.push({
            severity: "error",
            code: "contradictory-guide",
            message: `${entry.guide} maps ${entry.from.path.join(".")} to ${actual}, not ${expected}`
          })
        }
      }
    }
  }
  return diagnostics.sort((left, right) =>
    left.code.localeCompare(right.code) || left.message.localeCompare(right.message)
  )
}

export const mappingModules = (
  mapping: MigrationMap
): { readonly base: ReadonlyArray<string>; readonly head: ReadonlyArray<string> } => {
  const packageName = (module: string): string => {
    const parts = module.split("/")
    return module.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!
  }
  const sources = [
    ...mapping.modules.flatMap((entry) => entry.from === undefined ? [] : [entry.from]),
    ...mapping.apis.map((entry) => entry.from.module)
  ]
  const targets = [
    ...mapping.modules.flatMap((entry) => [...entry.to, ...(entry.barrels ?? [])]),
    ...mapping.apis.flatMap((entry) => entry.to === null ? [] : [entry.to.module])
  ]
  return {
    base: [...new Set([...sources, ...sources.map(packageName)])].sort(),
    head: [...new Set(targets)].sort()
  }
}

const renderApiTarget = (target: ApiTarget, source: boolean): string => {
  const moduleName = target.module.split("/").at(-1) ?? target.module
  if (target.path[0] === moduleName && (target.path.length > 1 || source)) {
    return target.path.join(".")
  }
  return [moduleName, ...target.path].join(".")
}

export const renderMigrationMarkdown = (mapping: MigrationMap): string => {
  const mapped = mapping.modules.filter((entry) => entry.from !== undefined)
  const added = mapping.modules.filter((entry) => entry.from === undefined)
  const apiRenames = [
    ...new Set(mapping.apis.map((entry) => {
      const from = renderApiTarget(entry.from, true)
      const to = entry.to === null ? "Removed" : renderApiTarget(entry.to, false)
      return `${from} -> ${to}`
    }))
  ]
  const lines = [
    "# v3 to v4 Import and API Rename Maps",
    "",
    `Mapped modules: ${mapped.reduce((total, entry) => total + entry.to.length, 0)}`,
    `No counterpart: ${added.length}`,
    `API renames: ${apiRenames.length}`,
    "",
    "This file is generated from `migration/v3-to-v4.json`. Do not edit it directly.",
    "",
    "## Import Map",
    "",
    "Each line is `v3 import -> v4 direct module import`. Suggested barrels are shown in parentheses.",
    "",
    "```text",
    ...mapped.map((entry) => {
      const target = entry.to.join(", ")
      const barrel = entry.barrels?.length === undefined || entry.barrels.length === 0
        ? ""
        : ` (barrel: ${entry.barrels.join(", ")})`
      return `${entry.from} -> ${target}${barrel}`
    }),
    "```",
    "",
    "## No Counterpart Imports",
    "",
    "These v4 modules did not have a mapped v3 module.",
    "",
    "```text",
    ...added.flatMap((entry) =>
      entry.to.map((target) => {
        const barrel = entry.barrels?.length === undefined || entry.barrels.length === 0
          ? ""
          : ` (barrel: ${entry.barrels.join(", ")})`
        return `${target}${barrel}`
      })
    ),
    "```",
    "",
    "## API Renames",
    "",
    "Each line is `v3 API -> v4 API`, using the namespaced spelling found in application code.",
    "",
    "```text",
    ...apiRenames,
    "```",
    ""
  ]
  return lines.join("\n")
}
