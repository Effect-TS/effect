// CPU / heap profiling helper. Profiled runs are INSTRUMENTED: never mix them
// into throughput results.
//
//   node profile.mts --workload <name> [--root <dir>] [--time 3000] [--warmup 500] [--interval 100]
//                    [--label <name>] [--heap-prof] [--top 25] [--window measure|all] [--size k=v]
//
// Output in tmp/fiberperf/profiles/<label>/: *.cpuprofile, cpu.folded, cpu.svg, top.txt, worker.json
// and with --heap-prof also *.heapprofile, heap.folded, heap.svg.
import { execFileSync, spawnSync } from "node:child_process"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { numberOption, parseArgs, resolveRoot, resultsDir, timestamp, workerPath, writeJson } from "./shared.mts"

const options = parseArgs()
if (typeof options.workload !== "string") throw new Error("--workload <name> is required")
const root = resolveRoot(options.root)
const timeMs = numberOption(options, "time", 3000)
const warmupMs = numberOption(options, "warmup", 500)
const intervalUs = numberOption(options, "interval", 100)
const topN = numberOption(options, "top", 25)
const label = typeof options.label === "string" ? options.label : `${options.workload}-${timestamp()}`
const dir = join(resultsDir, "profiles", label)
mkdirSync(dir, { recursive: true })

const nodeArgs = ["--cpu-prof", "--cpu-prof-dir", dir, "--cpu-prof-interval", String(intervalUs)]
if (options["heap-prof"] === true) nodeArgs.push("--heap-prof", "--heap-prof-dir", dir)
const workerArgs = [
  workerPath,
  "--root",
  root,
  "--workload",
  options.workload,
  "--time",
  String(timeMs),
  "--warmup",
  String(warmupMs),
  "--json"
]
if (typeof options.size === "string") workerArgs.push("--size", options.size)
console.log(`INSTRUMENTED profiling run (not a throughput measurement): ${options.workload} -> ${dir}`)
const result = spawnSync(process.execPath, [...nodeArgs, ...workerArgs], { encoding: "utf8" })
if (result.status !== 0) throw new Error(`profiled worker failed:\n${result.stderr}\n${result.stdout}`)
const lines = result.stdout.trim().split("\n")
const worker = { ...JSON.parse(lines[lines.length - 1]), instrumented: true, nodeArgs }
writeJson(join(dir, "worker.json"), worker)

// -----------------------------------------------------------------------------
// cpuprofile -> folded stacks
// -----------------------------------------------------------------------------

const frameName = (callFrame) => {
  const name = callFrame.functionName || "(anonymous)"
  if (!callFrame.url) return name
  let file = callFrame.url.replace(/^file:\/\//, "")
  if (file.startsWith(root)) file = relative(root, file)
  return `${name} ${file}:${callFrame.lineNumber + 1}`.replace(/;/g, ",")
}

/** Builds `stack -> weight` from a tree of nodes with ids/children (cpuprofile) or nested children (heapprofile). */
const foldCpuProfile = (profile, window) => {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]))
  const parent = new Map()
  for (const node of profile.nodes) for (const child of node.children ?? []) parent.set(child, node.id)
  const counts = new Map()
  let time = profile.startTime
  let kept = 0
  for (let i = 0; i < profile.samples.length; i++) {
    time += profile.timeDeltas[i]
    if (window !== undefined && (time < window[0] || time > window[1])) continue
    kept++
    counts.set(profile.samples[i], (counts.get(profile.samples[i]) ?? 0) + 1)
  }
  const stacks = new Map()
  for (const [id, count] of counts) {
    const frames = []
    for (let current = id; current !== undefined; current = parent.get(current)) {
      const node = byId.get(current)
      if (node.callFrame.functionName === "(root)") break
      frames.push(frameName(node.callFrame))
    }
    const key = frames.reverse().join(";")
    stacks.set(key, (stacks.get(key) ?? 0) + count)
  }
  return { stacks, kept, total: profile.samples.length }
}

const foldHeapProfile = (profile) => {
  const stacks = new Map()
  const visit = (node, path) => {
    const frames = node.callFrame.functionName === "(root)" ? path : [...path, frameName(node.callFrame)]
    if (node.selfSize > 0) {
      const key = frames.join(";")
      stacks.set(key, (stacks.get(key) ?? 0) + node.selfSize)
    }
    for (const child of node.children) visit(child, frames)
  }
  visit(profile.head, [])
  return stacks
}

const writeFolded = (path, stacks) => {
  const body = [...stacks].filter(([key]) => key.length > 0).map(([key, value]) => `${key} ${value}`).join("\n")
  writeFileSync(path, body + "\n")
}

// -----------------------------------------------------------------------------
// folded -> svg (inferno if available, otherwise a minimal built-in renderer)
// -----------------------------------------------------------------------------

const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const renderSvg = (stacks, title, unit) => {
  const rootNode = { name: "all", value: 0, children: new Map() }
  for (const [key, value] of stacks) {
    if (key.length === 0) continue
    rootNode.value += value
    let node = rootNode
    for (const frame of key.split(";")) {
      let child = node.children.get(frame)
      if (child === undefined) {
        child = { name: frame, value: 0, children: new Map() }
        node.children.set(frame, child)
      }
      child.value += value
      node = child
    }
  }
  const width = 1600
  const rowHeight = 17
  const rects = []
  let maxDepth = 0
  const layout = (node, x, depth) => {
    const w = node.value / rootNode.value * width
    if (w < 0.3) return
    maxDepth = Math.max(maxDepth, depth)
    rects.push({ node, x, w, depth })
    let childX = x
    for (const child of [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      layout(child, childX, depth + 1)
      childX += child.value / rootNode.value * width
    }
  }
  layout(rootNode, 0, 0)
  const height = (maxDepth + 1) * rowHeight + 40
  const body = rects.map(({ depth, node, w, x }) => {
    const y = height - (depth + 1) * rowHeight - 10
    const hue = 20 + (node.name.length * 7) % 40
    const pct = (node.value / rootNode.value * 100).toFixed(2)
    const text = w > 40 ? escapeXml(node.name.slice(0, Math.floor(w / 7))) : ""
    return `<g><title>${escapeXml(node.name)} (${node.value} ${unit}, ${pct}%)</title>` +
      `<rect x="${x.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowHeight - 1}" ` +
      `fill="hsl(${hue},90%,60%)"/><text x="${(x + 3).toFixed(2)}" y="${y + 12}">${text}</text></g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="monospace" ` +
    `font-size="11"><text x="10" y="20" font-size="14">${escapeXml(title)}</text>\n${body.join("\n")}\n</svg>\n`
}

const flamegraph = (foldedPath, svgPath, stacks, title, unit) => {
  const folded = readFileSync(foldedPath)
  const attempts = [
    ["inferno-flamegraph", ["--title", title, "--countname", unit]],
    ["nix", ["shell", "nixpkgs#inferno", "--command", "inferno-flamegraph", "--title", title, "--countname", unit]]
  ]
  for (const [command, args] of attempts) {
    try {
      const svg = execFileSync(command, args, { input: folded, stdio: ["pipe", "pipe", "ignore"], timeout: 300_000 })
      if (svg.length > 0) {
        writeFileSync(svgPath, svg)
        return `inferno (${command})`
      }
    } catch {
      // try the next renderer
    }
  }
  writeFileSync(svgPath, renderSvg(stacks, title, unit))
  return "built-in renderer"
}

// -----------------------------------------------------------------------------
// top-N summary
// -----------------------------------------------------------------------------

const summarize = (stacks, unit, scale) => {
  const self = new Map()
  const total = new Map()
  let sum = 0
  for (const [key, value] of stacks) {
    if (key.length === 0) continue
    sum += value
    const frames = key.split(";")
    const leaf = frames[frames.length - 1]
    self.set(leaf, (self.get(leaf) ?? 0) + value)
    for (const frame of new Set(frames)) total.set(frame, (total.get(frame) ?? 0) + value)
  }
  const format = (value) => `${(value / sum * 100).toFixed(1).padStart(5)}% ${scale(value).padStart(10)}`
  const out = []
  out.push(`top ${topN} by self ${unit} (total ${scale(sum)})`)
  for (const [frame, value] of [...self].sort((a, b) => b[1] - a[1]).slice(0, topN)) {
    out.push(`  ${format(value)}  total ${format(total.get(frame))}  ${frame}`)
  }
  out.push(`top ${topN} by total (inclusive) ${unit}`)
  for (const [frame, value] of [...total].sort((a, b) => b[1] - a[1]).slice(0, topN)) {
    out.push(`  ${format(value)}  ${frame}`)
  }
  return out.join("\n")
}

const files = readdirSync(dir)
const cpuFile = files.filter((f) => f.endsWith(".cpuprofile")).sort().pop()
if (cpuFile === undefined) throw new Error(`no .cpuprofile written to ${dir}`)
const cpuProfile = JSON.parse(readFileSync(join(dir, cpuFile), "utf8"))
const windowUs = options.window === "all"
  ? undefined
  : worker.measureWindowNs.map((ns) => Number(BigInt(ns) / 1000n))
let folded = foldCpuProfile(cpuProfile, windowUs)
if (windowUs !== undefined && folded.kept === 0) {
  console.warn("WARNING: no samples inside the measured window (clock mismatch?); using the whole profile")
  folded = foldCpuProfile(cpuProfile, undefined)
}
const ms = (samples) => `${(samples * intervalUs / 1000).toFixed(1)}ms`
writeFolded(join(dir, "cpu.folded"), folded.stacks)
const cpuRenderer = flamegraph(
  join(dir, "cpu.folded"),
  join(dir, "cpu.svg"),
  folded.stacks,
  `${options.workload} cpu (${windowUs === undefined ? "whole process" : "measured window"})`,
  "samples"
)
let report = `INSTRUMENTED profile of ${options.workload} (root ${root}, src ${worker.source.srcHash})\n` +
  `samples kept ${folded.kept}/${folded.total} (${windowUs === undefined ? "whole process" : "measured window only"})` +
  `, interval ${intervalUs}us, iterations ${worker.iterations}, mean ${
    (worker.meanNs / 1e6).toFixed(2)
  }ms (instrumented)\n` +
  summarize(folded.stacks, "cpu samples", ms)

if (options["heap-prof"] === true) {
  const heapFile = files.filter((f) => f.endsWith(".heapprofile")).sort().pop()
  if (heapFile === undefined) {
    report += "\nno .heapprofile written"
  } else {
    const heapStacks = foldHeapProfile(JSON.parse(readFileSync(join(dir, heapFile), "utf8")))
    writeFolded(join(dir, "heap.folded"), heapStacks)
    flamegraph(join(dir, "heap.folded"), join(dir, "heap.svg"), heapStacks, `${options.workload} heap`, "bytes")
    report += "\n\nsampling heap profile (live sampled allocations at process exit, whole process)\n" +
      summarize(heapStacks, "bytes", (bytes) => `${(bytes / 1024).toFixed(1)}KiB`)
  }
}
writeFileSync(join(dir, "top.txt"), report + "\n")
console.log(report)
console.log(`\nflame graph renderer: ${cpuRenderer}`)
console.log(`files: ${readdirSync(dir).map((f) => join(dir, f)).join("\n       ")}`)
