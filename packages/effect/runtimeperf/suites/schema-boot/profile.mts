import { readFileSync } from "node:fs"
import { SourceMap } from "node:module"
import { fileURLToPath } from "node:url"

export const groups = [
  "Schema",
  "SchemaAST",
  "SchemaParser",
  "schema-other",
  "http-api",
  "http",
  "effect-core",
  "fixture",
  "gc",
  "runtime"
] as const
type Group = typeof groups[number]

const schemaGroups = new Set<Group>(["Schema", "SchemaAST", "SchemaParser", "schema-other"])

const groupOf = (source: string | undefined): Group => {
  if (source === undefined) return "runtime"
  if (source.includes("/schema-boot/fixtures/")) return "fixture"
  const index = source.lastIndexOf("/packages/effect/src/")
  if (index === -1) return "runtime"
  const path = source.slice(index + "/packages/effect/src/".length)
  if (path === "Schema.ts") return "Schema"
  if (path === "SchemaAST.ts") return "SchemaAST"
  if (path === "SchemaParser.ts") return "SchemaParser"
  if (/^(Schema[A-Za-z]*\.ts|internal\/schema\/|schema\/)/.test(path)) return "schema-other"
  if (path.startsWith("http-api/")) return "http-api"
  if (path.startsWith("http/")) return "http"
  return "effect-core"
}

const shortSource = (source: string | undefined) => {
  if (source === undefined) return "?"
  const index = source.lastIndexOf("/packages/effect/")
  return index === -1 ? source : source.slice(index + "/packages/effect/".length)
}

const top = (counts: Map<string, number>, limit: number) =>
  [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, samples]) => ({ label, samples }))

// Attributes CPU samples of one bundled phase to original Effect source files.
// Self time is grouped by module; schema entry points are the outermost Schema
// frame on each sample's stack, i.e. the operation that started the schema work.
export const analyzeProfile = (profile: any, bundlePath: string) => {
  const map = new SourceMap(JSON.parse(readFileSync(`${bundlePath}.map`, "utf8")))
  const bundleDir = fileURLToPath(new URL(".", `file://${bundlePath}`))
  const nodes = new Map<number, any>()
  const parents = new Map<number, number>()
  for (const node of profile.nodes) {
    nodes.set(node.id, node)
    for (const child of node.children ?? []) parents.set(child, node.id)
  }
  const frames = new Map<number, { group: Group; label: string }>()
  const frameOf = (id: number) => {
    let frame = frames.get(id)
    if (frame) return frame
    const { callFrame } = nodes.get(id)
    if (callFrame.functionName === "(garbage collector)") {
      frame = { group: "gc", label: "(garbage collector)" }
    } else if (callFrame.url.endsWith(".mjs") && callFrame.url.includes(bundleDir)) {
      const entry: any = map.findEntry(callFrame.lineNumber, callFrame.columnNumber)
      const source = entry?.originalSource ? fileURLToPath(new URL(entry.originalSource, callFrame.url)) : undefined
      frame = {
        group: groupOf(source),
        label: `${callFrame.functionName || "(anonymous)"} ${shortSource(source)}:${(entry?.originalLine ?? -1) + 1}`
      }
    } else {
      const url = callFrame.url ? callFrame.url.slice(callFrame.url.lastIndexOf("/") + 1) : "(native)"
      frame = { group: "runtime", label: `${callFrame.functionName || "(anonymous)"} ${url}` }
    }
    frames.set(id, frame)
    return frame
  }
  const self = Object.fromEntries(groups.map((group) => [group, 0])) as Record<Group, number>
  const selfFunctions = new Map<string, number>()
  const entries = new Map<string, number>()
  let schemaSamples = 0
  for (const id of profile.samples) {
    const leaf = frameOf(id)
    self[leaf.group]++
    selfFunctions.set(leaf.label, (selfFunctions.get(leaf.label) ?? 0) + 1)
    let outermost: string | undefined
    for (let current: number | undefined = id; current !== undefined; current = parents.get(current)) {
      const frame = frameOf(current)
      if (schemaGroups.has(frame.group)) outermost = frame.label
    }
    if (outermost) {
      schemaSamples++
      entries.set(outermost, (entries.get(outermost) ?? 0) + 1)
    }
  }
  return {
    samples: profile.samples.length,
    schemaSamples,
    self,
    selfFunctions: top(selfFunctions, 25),
    schemaEntries: top(entries, 25)
  }
}

export const mergeProfiles = (analyses: Array<ReturnType<typeof analyzeProfile>>) => {
  const sum = (key: "selfFunctions" | "schemaEntries") => {
    const counts = new Map<string, number>()
    for (const analysis of analyses) {
      for (const { label, samples } of analysis[key]) counts.set(label, (counts.get(label) ?? 0) + samples)
    }
    return top(counts, 15)
  }
  const samples = analyses.reduce((total, analysis) => total + analysis.samples, 0)
  const self = Object.fromEntries(
    groups.map((group) => [group, analyses.reduce((total, analysis) => total + analysis.self[group], 0)])
  ) as Record<Group, number>
  return {
    samples,
    schemaSamples: analyses.reduce((total, analysis) => total + analysis.schemaSamples, 0),
    self,
    selfFunctions: sum("selfFunctions"),
    schemaEntries: sum("schemaEntries")
  }
}
