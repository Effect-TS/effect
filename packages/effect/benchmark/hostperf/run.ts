/**
 * Runs the hostperf cases in Node.js, Bun, Chromium and WebKit and writes one
 * JSON report. See README.md.
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import type { Browser, BrowserContext } from "playwright"
import { chromium, webkit } from "playwright"
import { build } from "vite"
import type { RoundResult, Settings } from "./harness.ts"
import { median, speedup } from "./stats.ts"

const hostperfDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(hostperfDir, "../../../..")
const tmpDir = join(repoRoot, "tmp", "hostperf")
const bundleDir = join(tmpDir, "bundle")

const allHosts = ["node", "bun", "chromium", "webkit"] as const
type Host = typeof allHosts[number]

interface Measurement {
  readonly operations: number
  readonly runtime: string
  readonly timerResolutionMs: number
  readonly result: RoundResult
}

interface CaseReport {
  readonly name: string
  readonly operations: number
  /** Over the samples of every round, in nanoseconds per operation. */
  medianNs: number
  minNs: number
  maxNs: number
  readonly rounds: Array<RoundResult>
}

interface HostReport {
  readonly host: Host
  runtime?: string
  timerResolutionMs?: number
  durationMs: number
  readonly cases: Array<CaseReport>
  readonly errors: Array<string>
}

interface Report {
  readonly schemaVersion: 1
  readonly createdAt: string
  readonly git: { readonly sha: string; readonly dirty: boolean }
  readonly settings: Settings & { readonly rounds: number }
  durationMs: number
  readonly hosts: Array<HostReport>
}

const usage = `Usage: pnpm hostperf [case-filter...] [options]

Options:
  --host <list>        Comma-separated hosts (default: ${allHosts.join(",")})
  --baseline <file>    Compare against an earlier report
  --out <file>         Report path (default: tmp/hostperf/results/<timestamp>.json)
  --rounds <n>         Fresh processes or pages per case (default: 3)
  --samples <n>        Timed samples per case and round (default: 10)
  --sample-ms <ms>     Target duration of one sample (default: 10)
  --warmup-ms <ms>     Warmup per case and round (default: 100)
  --max-case-ms <ms>   Stop sampling a slow round after this long, keeping at least 3 samples (default: 1000)
  --timeout-ms <ms>    Kill a round that has not finished after this long (default: 60000)
  --list               Print the case names
`

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    host: { type: "string", default: allHosts.join(",") },
    baseline: { type: "string" },
    out: { type: "string" },
    rounds: { type: "string", default: "3" },
    samples: { type: "string", default: "10" },
    "sample-ms": { type: "string", default: "10" },
    "warmup-ms": { type: "string", default: "100" },
    "max-case-ms": { type: "string", default: "1000" },
    "timeout-ms": { type: "string", default: "60000" },
    list: { type: "boolean", default: false },
    help: { type: "boolean", default: false }
  }
})

const positive = (name: string, raw: string) => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be a positive number`)
  return value
}

const positiveInteger = (name: string, raw: string) => {
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`--${name} must be a positive integer`)
  return value
}

const git = (...args: Array<string>) => spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" }).stdout.trim()

const bundle = async () => {
  await build({
    configFile: false,
    logLevel: "warn",
    resolve: {
      alias: [{ find: /^effect$/, replacement: resolve(hostperfDir, "../../src/index.ts") }]
    },
    build: {
      outDir: bundleDir,
      emptyOutDir: true,
      minify: false,
      target: "es2022",
      lib: { entry: join(hostperfDir, "entry.ts"), formats: ["es"], fileName: () => "hostperf.js" }
    }
  })
  const runner = join(bundleDir, "runner.mjs")
  writeFileSync(
    runner,
    `await import("./hostperf.js")
const output = await globalThis.__hostperf.run(JSON.parse(process.argv[2]))
process.stdout.write(JSON.stringify(output), () => process.exit(0))
`
  )
  return { script: join(bundleDir, "hostperf.js"), runner }
}

const timeoutError = (timeoutMs: number) => new Error(`Timed out after ${timeoutMs} ms`)

const runProcess = (command: string, args: Array<string>, timeoutMs: number) =>
  new Promise<Measurement>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)
    child.stdout.on("data", (chunk) => stdout += chunk)
    child.stderr.on("data", (chunk) => stderr += chunk)
    child.on("error", reject)
    child.on("close", (code) => {
      clearTimeout(timer)
      if (timedOut) return reject(timeoutError(timeoutMs))
      if (code !== 0) return reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`))
      try {
        resolvePromise(JSON.parse(stdout))
      } catch {
        reject(new Error(`${command} wrote output that is not a measurement: ${stdout.slice(0, 200)}`))
      }
    })
  })

const origin = "http://localhost"

const runPage = async (browser: Browser, script: string, input: unknown, timeoutMs: number): Promise<Measurement> => {
  const context = await browser.newContext()
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs)
  })
  try {
    return await Promise.race([measurePage(context, script, input), deadline])
  } finally {
    clearTimeout(timer)
    // Closing the context also abandons a page that is still measuring.
    await context.close()
  }
}

const measurePage = async (context: BrowserContext, script: string, input: unknown): Promise<Measurement> => {
  // Cross-origin isolation gives the page its finest performance.now() resolution.
  const headers = {
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp"
  }
  await context.route(`${origin}/**`, (route) => {
    const url = new URL(route.request().url())
    return url.pathname === "/hostperf.js"
      ? route.fulfill({ headers, contentType: "text/javascript", body: script })
      : route.fulfill({
        headers,
        contentType: "text/html",
        body: "<!doctype html><script type=\"module\" src=\"/hostperf.js\"></script>"
      })
  })
  const page = await context.newPage()
  await page.goto(`${origin}/`)
  await page.waitForFunction(() => (globalThis as any).__hostperf !== undefined)
  return await page.evaluate((input) => (globalThis as any).__hostperf.run(input), input)
}

/**
 * A case is `faster` or `slower` when its whole interval is outside this band,
 * `same` when the whole interval is inside it, and `inconclusive` otherwise.
 */
const noiseBand = 0.05

const verdict = ({ high, low }: { readonly low: number; readonly high: number }) =>
  low > 1 + noiseBand
    ? "faster"
    : high < 1 / (1 + noiseBand)
    ? "slower"
    : low >= 1 / (1 + noiseBand) && high <= 1 + noiseBand
    ? "same"
    : "inconclusive"

const formatNs = (ns: number) =>
  ns >= 1e6 ? `${(ns / 1e6).toFixed(2)} ms` : ns >= 1e3 ? `${(ns / 1e3).toFixed(2)} µs` : `${ns.toFixed(1)} ns`

const formatX = (value: number) => `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}x`

const printTable = (rows: ReadonlyArray<ReadonlyArray<string>>) => {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)))
  for (const row of rows) console.log(row.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd())
}

const printReport = (report: Report, baseline: Report | undefined) => {
  const samples = (c: CaseReport) => c.rounds.map((round) => round.samples)
  const rows: Array<{ readonly cells: Array<string>; readonly sort: number }> = []
  for (const host of report.hosts) {
    for (const result of host.cases) {
      const cells = [host.host, result.name, formatNs(result.medianNs), String(samples(result).flat().length)]
      const base = baseline?.hosts.find((h) => h.host === host.host)?.cases.find((c) => c.name === result.name)
      if (baseline === undefined) {
        rows.push({ cells, sort: 0 })
      } else if (base === undefined) {
        rows.push({ cells: [...cells, "-", "-", "-"], sort: -Infinity })
      } else {
        const s = speedup(samples(base), samples(result))
        cells.push(formatX(s.speedup), `${formatX(s.low)}-${formatX(s.high)}`, verdict(s))
        rows.push({ cells, sort: s.speedup })
      }
    }
  }
  if (baseline !== undefined) rows.sort((a, b) => b.sort - a.sort)
  const header = ["host", "case", "median/op", "n"]
  if (baseline !== undefined) header.push("speedup", "95% CI", "")
  printTable([header, ...rows.map((row) => row.cells)])
  for (const host of report.hosts) {
    for (const error of host.errors) console.error(`${host.host}: ${error}`)
  }
}

const main = async () => {
  if (values.help) {
    console.log(usage)
    return
  }
  const hosts = values.host.split(",").map((host) => host.trim()) as Array<Host>
  for (const host of hosts) {
    if (!allHosts.includes(host)) throw new Error(`Unknown host ${host}; expected one of ${allHosts.join(", ")}`)
  }
  const settings: Settings = {
    samples: positiveInteger("samples", values.samples),
    sampleMs: positive("sample-ms", values["sample-ms"]),
    warmupMs: positive("warmup-ms", values["warmup-ms"]),
    maxCaseMs: positive("max-case-ms", values["max-case-ms"]),
    minSamples: 3
  }
  const rounds = positiveInteger("rounds", values.rounds)
  const timeoutMs = positive("timeout-ms", values["timeout-ms"])
  const baseline: Report | undefined = values.baseline === undefined
    ? undefined
    : JSON.parse(readFileSync(values.baseline, "utf8"))

  const started = performance.now()
  const { runner, script } = await bundle()
  await import(script)
  const allCases: ReadonlyArray<string> = (globalThis as any).__hostperf.cases
  if (values.list) {
    for (const name of allCases) console.log(name)
    return
  }
  const filters = positionals.map((filter) => filter.toLowerCase())
  const selected = allCases.filter((name) =>
    filters.length === 0 || filters.some((filter) => name.toLowerCase().includes(filter))
  )
  if (selected.length === 0) throw new Error(`No cases match ${positionals.join(", ")}`)

  const report: Report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    git: { sha: git("rev-parse", "HEAD"), dirty: git("status", "--porcelain") !== "" },
    settings: { ...settings, rounds },
    durationMs: 0,
    hosts: []
  }
  const scriptSource = readFileSync(script, "utf8")

  for (const host of hosts) {
    const hostStarted = performance.now()
    const hostReport: HostReport = { host, durationMs: 0, cases: [], errors: [] }
    report.hosts.push(hostReport)
    let browser: Browser | undefined
    try {
      if (host === "chromium" || host === "webkit") {
        browser = await (host === "chromium" ? chromium : webkit).launch()
      } else if (host === "bun" && spawnSync("bun", ["--version"]).error !== undefined) {
        throw new Error("bun is not on PATH")
      }
      // Every round runs every case in a fresh process or page, so JIT state
      // does not leak between cases and noise between processes is measured.
      const byName = new Map<string, CaseReport>()
      for (let round = 1; round <= rounds; round++) {
        for (const name of selected) {
          const input = { case: name, settings }
          try {
            const measurement = browser === undefined
              ? await runProcess(host === "node" ? process.execPath : "bun", [runner, JSON.stringify(input)], timeoutMs)
              : await runPage(browser, scriptSource, input, timeoutMs)
            hostReport.runtime = measurement.runtime
            hostReport.timerResolutionMs = measurement.timerResolutionMs
            const caseReport = byName.get(name) ??
              { name, operations: measurement.operations, medianNs: 0, minNs: 0, maxNs: 0, rounds: [] }
            caseReport.rounds.push(measurement.result)
            byName.set(name, caseReport)
            console.error(`${host} ${name} #${round}: ${formatNs(median(measurement.result.samples))}/op`)
          } catch (error) {
            hostReport.errors.push(`${name} #${round}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }
      for (const caseReport of byName.values()) {
        const all = caseReport.rounds.flatMap((round) => round.samples)
        caseReport.medianNs = median(all)
        caseReport.minNs = Math.min(...all)
        caseReport.maxNs = Math.max(...all)
        hostReport.cases.push(caseReport)
      }
    } catch (error) {
      hostReport.errors.push(error instanceof Error ? error.message : String(error))
    } finally {
      await browser?.close()
      hostReport.durationMs = performance.now() - hostStarted
    }
  }
  report.durationMs = performance.now() - started

  const out = resolve(values.out ?? join(tmpDir, "results", `${report.createdAt.replace(/[:.]/g, "-")}.json`))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
  printReport(report, baseline)
  const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`
  const perHost = report.hosts.map((host) => `${host.host} ${seconds(host.durationMs)}`).join(", ")
  console.log(`\nWrote ${relative(process.cwd(), out)} in ${seconds(report.durationMs)} (${perHost})`)
  if (report.hosts.some((host) => host.errors.length > 0)) process.exitCode = 1
}

await main()
