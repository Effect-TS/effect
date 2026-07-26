import type { MigrationAnnotation } from "./Annotations.ts"
import type { ApiChange, ApiDiff, ChangeClassification } from "./Model.ts"

const breakingClassifications = new Set<ChangeClassification>([
  "bucket-changed",
  "declaration-kind-changed",
  "overload-removed",
  "overload-reordered",
  "parameter-removed",
  "parameter-reordered",
  "parameter-changed",
  "return-type-changed",
  "generic-parameter-changed",
  "member-removed",
  "member-changed",
  "heritage-changed",
  "union-member-changed",
  "intersection-member-changed",
  "structural-change"
])

const stableApiId = (id: string): string => id.replace(/#(?:type|value)$/, "")

const compareStrings = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0

const isBreakingChange = (change: ApiChange): boolean => {
  if (change.classification !== "parameter-added") {
    return breakingClassifications.has(change.classification)
  }
  const delta = change.delta as {
    readonly before?: ReadonlyArray<unknown>
    readonly after?: ReadonlyArray<{ readonly optional?: boolean; readonly rest?: boolean }>
  } | undefined
  const beforeLength = delta?.before?.length ?? 0
  return delta?.after?.slice(beforeLength).some((parameter) => !parameter.optional && !parameter.rest) ?? true
}

interface MigrationEntry {
  readonly id: string
  readonly module: string
  readonly changes: ReadonlyArray<ApiChange>
  readonly rename: ApiChange | undefined
  readonly before: string | undefined
  readonly after: string | undefined
  readonly detailed: boolean
}

const migrationEntries = (diff: ApiDiff): ReadonlyArray<MigrationEntry> => {
  const grouped = new Map<string, Array<ApiChange>>()
  for (const change of diff.changes) {
    if (change.baseApiId === undefined) {
      continue
    }
    const id = stableApiId(change.baseApiId)
    const changes = grouped.get(id)
    if (changes === undefined) {
      grouped.set(id, [change])
    } else {
      changes.push(change)
    }
  }

  const entries: Array<MigrationEntry> = []
  for (const [id, changes] of grouped) {
    const rename = changes.find((change) => change.classification === "api-renamed")
    const breaking = changes.some(isBreakingChange)
    const removed = changes.some((change) => change.classification === "api-removed")
    const importMove = changes.some((change) => change.classification === "api-moved")
    if ((!breaking && rename === undefined && !removed) || (importMove && rename === undefined && !breaking)) {
      continue
    }
    entries.push({
      id,
      module: id.split("#")[0]!,
      changes,
      rename,
      before: changes.find((change) => change.before !== undefined)?.before,
      after: changes.find((change) => change.after !== undefined)?.after,
      detailed: breaking || rename === undefined
    })
  }
  return entries.sort((left, right) => compareStrings(left.module, right.module) || compareStrings(left.id, right.id))
}

const codeBlock = (label: string, source: string | undefined): ReadonlyArray<string> =>
  source === undefined ? [] : [`**${label}**`, "", "```ts", source, "```", ""]

const renderDetailedEntry = (
  entry: MigrationEntry,
  annotation: MigrationAnnotation | undefined
): ReadonlyArray<string> => [
  `#### \`${entry.id}\``,
  "",
  ...(annotation === undefined
    ? ["TODO: needs guidance", ""]
    : [`**Replacement:** \`${annotation.replacement}\``, "", annotation.note, ""]),
  ...codeBlock("Before", entry.before),
  ...codeBlock("After", entry.after),
  ...(annotation?.example === undefined
    ? []
    : ["**Example**", "", "```ts", annotation.example, "```", ""])
]

const renderRename = (
  entry: MigrationEntry,
  annotation: MigrationAnnotation | undefined
): string => {
  const target = entry.rename?.headApiId === undefined ? "unknown" : stableApiId(entry.rename.headApiId)
  return annotation === undefined
    ? `- \`${entry.id}\` -> \`${target}\`: TODO: needs guidance`
    : `- \`${entry.id}\` -> \`${annotation.replacement}\`: ${annotation.note}`
}

export const extractImportMapSections = (document: string): string => {
  const start = document.indexOf("## Import Map")
  if (start === -1) {
    return "## Import Map\n\nNo import map is available.\n"
  }
  const apiRenames = document.indexOf("\n## API Renames", start)
  const apiReference = document.indexOf("\n## API Reference", start)
  const ends = [apiRenames, apiReference].filter((index) => index !== -1)
  const end = ends.length === 0 ? document.length : Math.min(...ends)
  return `${document.slice(start, end).trim()}\n`
}

export const renderMigrationDocument = (
  diff: ApiDiff,
  annotations: ReadonlyMap<string, MigrationAnnotation>,
  importMapSections: string
): string => {
  const entries = migrationEntries(diff)
  const modules = new Map<string, Array<MigrationEntry>>()
  for (const entry of entries) {
    const group = modules.get(entry.module)
    if (group === undefined) {
      modules.set(entry.module, [entry])
    } else {
      group.push(entry)
    }
  }
  const lines = [
    "<!-- dprint-ignore-file -->",
    "",
    "# v3 to v4 Migration Reference",
    "",
    `Base: \`${diff.base.ref}\` (\`${diff.base.sha}\`)`,
    "",
    `Head: \`${diff.head.ref}\` (\`${diff.head.sha}\`)`,
    "",
    "This file is generated from the API diff and `migration/annotations/*.yaml`.",
    "",
    importMapSections.trim(),
    "",
    "## API Reference",
    ""
  ]
  for (const [module, moduleEntries] of modules) {
    lines.push(`### \`${module}\``, "")
    for (const entry of moduleEntries) {
      const annotation = annotations.get(entry.id)
      if (entry.detailed) {
        lines.push(...renderDetailedEntry(entry, annotation))
      } else {
        lines.push(renderRename(entry, annotation), "")
      }
    }
  }
  return `${lines.join("\n").trim()}\n`
}

export const unannotatedApiIds = (
  diff: ApiDiff,
  annotations: ReadonlyMap<string, MigrationAnnotation>
): ReadonlyMap<string, ReadonlyArray<string>> => {
  const modules = new Map<string, Array<string>>()
  for (const entry of migrationEntries(diff)) {
    if (annotations.has(entry.id)) {
      continue
    }
    const ids = modules.get(entry.module)
    if (ids === undefined) {
      modules.set(entry.module, [entry.id])
    } else {
      ids.push(entry.id)
    }
  }
  return modules
}

export const renderMissingAnnotations = (
  diff: ApiDiff,
  annotations: ReadonlyMap<string, MigrationAnnotation>
): string => {
  const missing = unannotatedApiIds(diff, annotations)
  if (missing.size === 0) {
    return "All migration APIs are annotated.\n"
  }
  return `${
    [...missing].flatMap(([module, ids]) => [
      `${module}:`,
      ...ids.map((id) => `  - ${id}`)
    ]).join("\n")
  }\n`
}
