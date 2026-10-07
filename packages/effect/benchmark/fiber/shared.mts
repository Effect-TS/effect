// Shared helpers for the fiber benchmark drivers (run, compare, memory, profile).
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import * as os from "node:os"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const harnessDir = dirname(fileURLToPath(import.meta.url))
export const repoRoot = resolve(harnessDir, "../../../..")
export const resultsDir = resolve(repoRoot, "tmp/fiberperf")
export const workerPath = resolve(harnessDir, "worker.mts")

export const parseArgs = (argv = process.argv.slice(2)) => {
  const options = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument ${arg}`)
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) {
      options[key] = true
    } else {
      options[key] = next
      i++
    }
  }
  return options
}

export const numberOption = (options, key, fallback) => {
  const raw = options[key]
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${key} must be a non-negative number`)
  return value
}

/** Parses `--size key=value,key2=value2` workload size overrides. */
export const parseSizeOverrides = (raw) => {
  if (raw === undefined || raw === true) return {}
  const overrides = {}
  for (const pair of raw.split(",")) {
    const [key, value] = pair.split("=")
    const parsed = Number(value)
    if (key === undefined || !Number.isFinite(parsed)) throw new Error(`Invalid --size entry ${pair}`)
    overrides[key] = parsed
  }
  return overrides
}

export const resolveRoot = (raw) => resolve(raw === undefined || raw === true ? repoRoot : raw)

export const resolveOutput = (raw, fallbackName) => {
  const path = raw === undefined || raw === true
    ? resolve(resultsDir, fallbackName)
    : isAbsolute(raw)
    ? raw
    : resolve(process.cwd(), raw)
  mkdirSync(dirname(path), { recursive: true })
  return path
}

export const writeJson = (path, value) => {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

export const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-")

/** Selects workloads from `--workloads a,b` and/or `--group g1,g2`; default all. */
export const selectWorkloads = async (options) => {
  const { workloads } = await import("./workloads.ts")
  let selected = workloads
  if (typeof options.group === "string") {
    const groups = options.group.split(",")
    selected = selected.filter((w) => groups.includes(w.group))
  }
  if (typeof options.workloads === "string") {
    const names = options.workloads.split(",")
    for (const name of names) {
      if (!workloads.some((w) => w.name === name)) throw new Error(`Unknown workload ${name}`)
    }
    selected = selected.filter((w) => names.includes(w.name))
  }
  if (selected.length === 0) throw new Error("No workloads selected")
  return selected
}

const tryExec = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return null
  }
}

const listFiles = (dir) => {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

/**
 * Identifies the effect source a measurement ran against: git HEAD, whether
 * `packages/effect/src` differs from HEAD, and a content hash of that tree so
 * edits made between processes are detectable.
 */
export const sourceIdentity = (root) => {
  const srcDir = join(root, "packages/effect/src")
  const hash = createHash("sha256")
  const files = listFiles(srcDir).map((path) => relative(srcDir, path)).sort()
  for (const file of files) {
    hash.update(file)
    hash.update("\0")
    hash.update(readFileSync(join(srcDir, file)))
    hash.update("\0")
  }
  const status = tryExec("git", ["-C", root, "status", "--porcelain", "--", "packages/effect/src"])
  return {
    root,
    gitHead: tryExec("git", ["-C", root, "rev-parse", "HEAD"]),
    srcDirty: status === null ? null : status.length > 0,
    srcDirtyFiles: status === null ? [] : status.split("\n").filter((line) => line.length > 0).slice(0, 50),
    srcHash: hash.digest("hex").slice(0, 16),
    srcFiles: files.length
  }
}

export const engineInfo = () => {
  const g = globalThis
  if (g.Bun !== undefined) return { engine: "bun", version: g.Bun.version, v8: null }
  if (g.Deno !== undefined) return { engine: "deno", version: g.Deno.version.deno, v8: g.Deno.version.v8 }
  return { engine: "node", version: process.version, v8: process.versions.v8 }
}

export const engineCommand = (engine, script, args, extraFlags = []) => {
  switch (engine) {
    case "node":
      return { command: process.execPath, args: [...extraFlags, script, ...args] }
    case "bun":
      return { command: "bun", args: [...extraFlags, script, ...args] }
    case "deno":
      return { command: "deno", args: ["run", "-A", ...extraFlags, script, ...args] }
    default:
      throw new Error(`Unknown engine ${engine}`)
  }
}

export const environment = (engine) => {
  const cpus = os.cpus()
  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpuModel: cpus[0]?.model ?? "unknown",
    nproc: os.availableParallelism?.() ?? cpus.length,
    totalMemoryBytes: os.totalmem(),
    loadavg: os.loadavg(),
    driverNode: process.version,
    engine,
    engineVersion: engine === "node"
      ? process.version
      : engine === "bun"
      ? tryExec("bun", ["--version"])
      : tryExec("deno", ["--version"])?.split("\n")[0] ?? null,
    startedAt: new Date().toISOString()
  }
}

export const warnIfLoaded = () => {
  const [one] = os.loadavg()
  if (one > 1.5) {
    console.warn(
      `WARNING: 1-min loadavg is ${one.toFixed(2)} (> 1.5). Results may be noisy; ` +
        "wrap definitive runs in `flock /tmp/effect-fiber-bench.lock ...`."
    )
  }
}

/** Runs one fresh worker process and returns its parsed JSON output. */
export const runWorker = (
  { engine = "node", root, workload, timeMs, warmupMs, minIterations, size, pollute = false, extraFlags = [] }
) => {
  const args = [
    "--root",
    root,
    "--workload",
    workload,
    "--time",
    String(timeMs),
    "--warmup",
    String(warmupMs),
    "--json"
  ]
  if (minIterations !== undefined) args.push("--min-iterations", String(minIterations))
  if (typeof size === "string") args.push("--size", size)
  if (pollute) args.push("--pollute")
  const { command, args: fullArgs } = engineCommand(engine, workerPath, args, extraFlags)
  const loadBefore = os.loadavg()
  const result = spawnSync(command, fullArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  const loadAfter = os.loadavg()
  if (result.status !== 0) {
    throw new Error(
      `worker failed (${command} ${fullArgs.join(" ")}), status ${result.status}\n${result.stderr}\n${result.stdout}`
    )
  }
  const lines = result.stdout.trim().split("\n")
  const output = JSON.parse(lines[lines.length - 1])
  output.driver = { command, args: fullArgs, loadavgBefore: loadBefore, loadavgAfter: loadAfter }
  if (result.stderr.trim().length > 0) output.driver.stderr = result.stderr.trim()
  return output
}

export const formatNs = (ns) => {
  if (!Number.isFinite(ns)) return "n/a"
  if (ns >= 1e9) return `${(ns / 1e9).toFixed(2)}s`
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)}ms`
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(1)}us`
  return `${ns.toFixed(0)}ns`
}

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "n/a"
  const abs = Math.abs(bytes)
  if (abs >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MiB`
  if (abs >= 1024) return `${(bytes / 1024).toFixed(1)}KiB`
  return `${bytes.toFixed(1)}B`
}

export const formatPercent = (value, digits = 1) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%` : "n/a"

export const cv = (values) => {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1)
  return mean === 0 ? 0 : Math.sqrt(variance) / mean * 100
}

export const printTable = (headers, rows) => {
  const widths = headers.map((header, i) => Math.max(header.length, ...rows.map((row) => String(row[i]).length)))
  const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join("  ")
  console.log(line(headers))
  console.log(widths.map((w) => "-".repeat(w)).join("  "))
  for (const row of rows) console.log(line(row))
}
