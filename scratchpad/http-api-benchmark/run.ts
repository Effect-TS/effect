import { type ChildProcess, execFileSync, spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { Agent, createServer, request } from "node:http"
import { cpus, tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { HOST, MAX_DOCUMENT_LENGTH, type MetricsResponse, type ServerMetrics } from "./shared.ts"

type Framework = "Effect HttpServer" | "Hono"

interface Config {
  readonly connections: number
  readonly documents: number
  readonly durationMs: number
  readonly jsonPath: string | undefined
  readonly payloadBytes: number
  readonly readPercent: number
  readonly rounds: number
  readonly warmupMs: number
}

interface HttpResult {
  readonly body: string
  readonly bytes: number
  readonly status: number
}

interface LoadResult {
  readonly errors: number
  readonly elapsedMs: number
  readonly firstError: string | undefined
  readonly latencies: ReadonlyArray<number>
  readonly readRequests: number
  readonly responseBytes: number
  readonly requests: number
  readonly writeRequests: number
}

interface RoundResult {
  readonly framework: Framework
  readonly round: number
  readonly order: number
  readonly requests: number
  readonly readRequests: number
  readonly writeRequests: number
  readonly errors: number
  readonly requestsPerSecond: number
  readonly responseMiBPerSecond: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly p99Ms: number
  readonly maxMs: number
  readonly serverCpuMsPerRequest: number
  readonly serverEventLoopUtilization: number
  readonly serverRssMiB: number
}

interface RunningServer {
  readonly child: ChildProcess
  readonly port: number
  readonly stderr: () => string
  readonly stdout: () => string
}

const help = `Usage: node scratchpad/http-api-benchmark/run.ts [options]

Options:
  --connections=N       Concurrent keep-alive connections (default: 32)
  --documents=N         Files per operation type, 1-1000 (default: 256)
  --duration=N          Measured seconds per server per round (default: 10)
  --json=PATH           Also write raw results as JSON
  --payload-kib=N       ASCII document size in KiB, max 64 (default: 16)
  --read-percent=N      Percentage of GET requests, 0-100 (default: 80)
  --rounds=N            Paired rounds with alternating order (default: 5)
  --warmup=N            Warmup seconds per server per round (default: 3)
  --help                 Show this message
`

const argumentsMap = new Map<string, string>()
for (const argument of process.argv.slice(2)) {
  if (argument === "--help") {
    console.log(help)
    process.exit(0)
  }
  const match = /^(--[^=]+)=(.+)$/.exec(argument)
  if (match === null) {
    throw new Error(`Invalid argument: ${argument}\n\n${help}`)
  }
  argumentsMap.set(match[1], match[2])
}

const numberArgument = (name: string, fallback: number, minimum: number, maximum: number): number => {
  const raw = argumentsMap.get(name)
  if (raw === undefined) {
    return fallback
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`)
  }
  return value
}

const integerArgument = (name: string, fallback: number, minimum: number, maximum: number): number => {
  const value = numberArgument(name, fallback, minimum, maximum)
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`)
  }
  return value
}

const knownArguments = new Set([
  "--connections",
  "--documents",
  "--duration",
  "--json",
  "--payload-kib",
  "--read-percent",
  "--rounds",
  "--warmup"
])
for (const argument of argumentsMap.keys()) {
  if (!knownArguments.has(argument)) {
    throw new Error(`Unknown argument: ${argument}\n\n${help}`)
  }
}

const config: Config = {
  connections: integerArgument("--connections", 32, 1, 512),
  documents: integerArgument("--documents", 256, 1, 1_000),
  durationMs: numberArgument("--duration", 10, 0.1, 3_600) * 1_000,
  jsonPath: argumentsMap.get("--json"),
  payloadBytes: integerArgument("--payload-kib", 16, 1, MAX_DOCUMENT_LENGTH / 1_024) * 1_024,
  readPercent: integerArgument("--read-percent", 80, 0, 100),
  rounds: integerArgument("--rounds", 5, 1, 100),
  warmupMs: numberArgument("--warmup", 3, 0, 3_600) * 1_000
}

const makeContent = (label: string): string => {
  const prefix = `${label}:`
  return prefix + "x".repeat(config.payloadBytes - prefix.length)
}

const readContent = makeContent("read")
const writeContent = makeContent("write")
const writeBody = JSON.stringify({ content: writeContent })
const readResponseBytes = Buffer.byteLength(JSON.stringify({
  id: "read-000",
  content: readContent,
  bytes: config.payloadBytes
}))
const writeResponseBytes = Buffer.byteLength(JSON.stringify({ id: "write-000", bytes: config.payloadBytes }))

const packageVersion = async (specifier: string): Promise<string> => {
  const packageJsonUrl = new URL("../package.json", import.meta.resolve(specifier))
  const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8")) as { readonly version?: unknown }
  if (typeof packageJson.version !== "string") {
    throw new Error(`Could not read the version for ${specifier}`)
  }
  return packageJson.version
}

const versions = {
  effect: await packageVersion("effect"),
  hono: await packageVersion("hono"),
  honoNodeServer: await packageVersion("@hono/node-server")
}
const benchmarkSourceHash = createHash("sha256")
for (const filename of ["effect.ts", "hono.ts", "run.ts", "shared.ts"]) {
  benchmarkSourceHash.update(await readFile(new URL(filename, import.meta.url)))
}
const sourceHash = benchmarkSourceHash.digest("hex")
const git = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0
}
const corpusBaseDirectory = process.env.BENCH_TMPDIR ?? tmpdir()

const documentId = (operation: "read" | "write", index: number): string =>
  `${operation}-${index.toString().padStart(3, "0")}`

const percentile = (sorted: ReadonlyArray<number>, quantile: number): number => {
  if (sorted.length === 0) {
    return Number.NaN
  }
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)]
}

const median = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, HOST, () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        server.close()
        reject(new Error("Could not allocate a benchmark port"))
        return
      }
      server.close((error) => error ? reject(error) : resolve(address.port))
    })
  })

const sendRequest = (
  port: number,
  method: "GET" | "PUT",
  path: string,
  body?: string,
  agent?: Agent,
  collectBody = true,
  timeoutMs = 30_000
): Promise<HttpResult> =>
  new Promise((resolve, reject) => {
    const req = request({
      agent,
      hostname: HOST,
      method,
      path,
      port,
      headers: body === undefined ? { accept: "application/json" } : {
        accept: "application/json",
        "content-length": Buffer.byteLength(body),
        "content-type": "application/json"
      }
    }, (response) => {
      const chunks: Array<Buffer> | undefined = collectBody ? [] : undefined
      let bytes = 0
      response.on("data", (chunk: Buffer) => {
        chunks?.push(chunk)
        bytes += chunk.length
      })
      response.once("end", () => {
        resolve({
          body: chunks === undefined ? "" : Buffer.concat(chunks, bytes).toString("utf8"),
          bytes,
          status: response.statusCode ?? 0
        })
      })
      response.once("error", reject)
    })
    req.setTimeout(timeoutMs, () => req.destroy(new Error("request timed out")))
    req.once("error", reject)
    req.end(body)
  })

const waitForServer = async (server: RunningServer): Promise<void> => {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(
        `Server exited during startup with code ${server.child.exitCode}\n${server.stderr()}${server.stdout()}`
      )
    }
    try {
      const response = await sendRequest(server.port, "GET", "/documents/read-000", undefined, undefined, true, 500)
      if (response.status === 200) {
        return
      }
    } catch {
      // The child process has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Server did not start within 15 seconds\n${server.stderr()}${server.stdout()}`)
}

const startServer = async (framework: Framework, root: string): Promise<RunningServer> => {
  const port = await getFreePort()
  const entrypoint = framework === "Effect HttpServer" ? "effect.ts" : "hono.ts"
  const child = spawn(process.execPath, [fileURLToPath(new URL(entrypoint, import.meta.url))], {
    env: { ...process.env, BENCH_ROOT: root, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  })
  let stdout = ""
  let stderr = ""
  child.stdout?.setEncoding("utf8")
  child.stderr?.setEncoding("utf8")
  child.stdout?.on("data", (chunk: string) => {
    stdout += chunk
  })
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk
  })
  const running = { child, port, stderr: () => stderr, stdout: () => stdout }
  try {
    await waitForServer(running)
    return running
  } catch (error) {
    await stopServer(running)
    throw error
  }
}

let metricsMessageId = 0
const sendMetricsMessage = <Type extends MetricsResponse["type"]>(
  child: ChildProcess,
  type: Type extends "metrics:started" ? "metrics:start" : "metrics:stop",
  responseType: Type
): Promise<Extract<MetricsResponse, { readonly type: Type }>> =>
  new Promise((resolve, reject) => {
    const id = ++metricsMessageId
    const timeout = setTimeout(() => {
      child.off("message", onMessage)
      reject(new Error(`Timed out waiting for ${responseType}`))
    }, 5_000)
    const onMessage = (message: MetricsResponse) => {
      if (message.type === responseType && message.id === id) {
        clearTimeout(timeout)
        child.off("message", onMessage)
        resolve(message as Extract<MetricsResponse, { readonly type: Type }>)
      }
    }
    child.on("message", onMessage)
    child.send({ type, id }, (error) => {
      if (error) {
        clearTimeout(timeout)
        child.off("message", onMessage)
        reject(error)
      }
    })
  })

const stopServer = async (server: RunningServer): Promise<void> => {
  if (server.child.exitCode !== null) {
    return
  }
  server.child.kill("SIGTERM")
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      server.child.kill("SIGKILL")
    }, 5_000)
    server.child.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

const assertStatus = (result: HttpResult, expected: number, label: string): void => {
  if (result.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${result.status}: ${result.body}`)
  }
}

const verifyServer = async (port: number): Promise<void> => {
  const read = await sendRequest(port, "GET", "/documents/read-000")
  assertStatus(read, 200, "read probe")
  const readJson = JSON.parse(read.body) as {
    readonly id?: unknown
    readonly content?: unknown
    readonly bytes?: unknown
  }
  if (readJson.id !== "read-000" || readJson.content !== readContent || readJson.bytes !== config.payloadBytes) {
    throw new Error("read probe returned an unexpected response")
  }

  const write = await sendRequest(port, "PUT", "/documents/write-000", writeBody)
  assertStatus(write, 200, "write probe")
  const writeJson = JSON.parse(write.body) as { readonly id?: unknown; readonly bytes?: unknown }
  if (writeJson.id !== "write-000" || writeJson.bytes !== config.payloadBytes) {
    throw new Error("write probe returned an unexpected response")
  }

  const written = await sendRequest(port, "GET", "/documents/write-000")
  assertStatus(written, 200, "written document probe")
  const writtenJson = JSON.parse(written.body) as { readonly content?: unknown }
  if (writtenJson.content !== writeContent) {
    throw new Error("write probe did not persist the expected content")
  }

  assertStatus(await sendRequest(port, "GET", "/documents/invalid"), 400, "invalid id probe")
  assertStatus(await sendRequest(port, "PUT", "/documents/write-000", "{}"), 400, "invalid payload probe")
}

const runLoad = async (port: number, durationMs: number, agent: Agent): Promise<LoadResult> => {
  if (durationMs === 0) {
    return {
      errors: 0,
      elapsedMs: 0,
      firstError: undefined,
      latencies: [],
      readRequests: 0,
      requests: 0,
      responseBytes: 0,
      writeRequests: 0
    }
  }

  const latencies: Array<number> = []
  let errors = 0
  let firstError: string | undefined
  let nextRequest = 0
  let nextRead = 0
  let nextWrite = 0
  let readRequests = 0
  let responseBytes = 0
  let writeRequests = 0
  const startedAt = performance.now()
  const deadline = startedAt + durationMs

  const worker = async (): Promise<void> => {
    while (performance.now() < deadline) {
      const sequence = nextRequest++
      const isRead = (sequence * 37) % 100 < config.readPercent
      const index = isRead ? nextRead++ % config.documents : nextWrite++ % config.documents
      const operation = isRead ? "read" : "write"
      const started = performance.now()
      try {
        const result = await sendRequest(
          port,
          isRead ? "GET" : "PUT",
          `/documents/${documentId(operation, index)}`,
          isRead ? undefined : writeBody,
          agent,
          false
        )
        responseBytes += result.bytes
        if (result.status < 200 || result.status >= 300) {
          errors++
          firstError ??= `received HTTP ${result.status}`
        } else if (result.bytes !== (isRead ? readResponseBytes : writeResponseBytes)) {
          errors++
          firstError ??= `received ${result.bytes} response bytes, expected ${
            isRead ? readResponseBytes : writeResponseBytes
          }`
        }
      } catch (error) {
        errors++
        firstError ??= error instanceof Error ? error.message : String(error)
      }
      latencies.push(performance.now() - started)
      if (isRead) {
        readRequests++
      } else {
        writeRequests++
      }
    }
  }

  await Promise.all(Array.from({ length: config.connections }, () => worker()))
  const elapsedMs = performance.now() - startedAt
  return {
    elapsedMs,
    errors,
    firstError,
    latencies,
    readRequests,
    requests: readRequests + writeRequests,
    responseBytes,
    writeRequests
  }
}

const seedCorpus = async (root: string): Promise<void> => {
  await mkdir(root, { recursive: true })
  await Promise.all(Array.from({ length: config.documents }, async (_, index) => {
    await Promise.all([
      writeFile(join(root, `${documentId("read", index)}.txt`), readContent, "utf8"),
      writeFile(join(root, `${documentId("write", index)}.txt`), writeContent, "utf8")
    ])
  }))
}

const runFramework = async (framework: Framework, round: number, order: number): Promise<RoundResult> => {
  const root = await mkdtemp(join(corpusBaseDirectory, "effect-hono-http-api-"))
  const agent = new Agent({
    keepAlive: true,
    maxFreeSockets: config.connections,
    maxSockets: config.connections,
    scheduling: "fifo"
  })
  let server: RunningServer | undefined
  try {
    await seedCorpus(root)
    server = await startServer(framework, root)
    await verifyServer(server.port)
    if (config.warmupMs > 0) {
      await runLoad(server.port, config.warmupMs, agent)
    }

    await sendMetricsMessage(server.child, "metrics:start", "metrics:started")
    const load = await runLoad(server.port, config.durationMs, agent)
    const metricsResponse = await sendMetricsMessage(server.child, "metrics:stop", "metrics:stopped")
    if (load.errors > 0) {
      throw new Error(
        `${framework} returned ${load.errors} invalid measured responses: ${load.firstError ?? "unknown"}`
      )
    }
    await verifyServer(server.port)
    const metrics: ServerMetrics = metricsResponse.metrics
    const sortedLatencies = [...load.latencies].sort((left, right) => left - right)
    const elapsedSeconds = load.elapsedMs / 1_000
    const cpuMs = (metrics.userCpuMicros + metrics.systemCpuMicros) / 1_000

    return {
      framework,
      round,
      order,
      requests: load.requests,
      readRequests: load.readRequests,
      writeRequests: load.writeRequests,
      errors: load.errors,
      requestsPerSecond: load.requests / elapsedSeconds,
      responseMiBPerSecond: load.responseBytes / 1_048_576 / elapsedSeconds,
      p50Ms: percentile(sortedLatencies, 0.5),
      p95Ms: percentile(sortedLatencies, 0.95),
      p99Ms: percentile(sortedLatencies, 0.99),
      maxMs: percentile(sortedLatencies, 1),
      serverCpuMsPerRequest: cpuMs / load.requests,
      serverEventLoopUtilization: metrics.eventLoopUtilization,
      serverRssMiB: metrics.rssBytes / 1_048_576
    }
  } finally {
    agent.destroy()
    if (server !== undefined) {
      await stopServer(server)
    }
    await rm(root, { recursive: true, force: true })
  }
}

const formatRoundResult = (result: RoundResult) => ({
  round: result.round,
  order: result.order,
  framework: result.framework,
  "req/s": result.requestsPerSecond.toFixed(0),
  "MiB/s": result.responseMiBPerSecond.toFixed(1),
  "p50 ms": result.p50Ms.toFixed(2),
  "p95 ms": result.p95Ms.toFixed(2),
  "p99 ms": result.p99Ms.toFixed(2),
  "max ms": result.maxMs.toFixed(2),
  errors: result.errors,
  "CPU ms/req": result.serverCpuMsPerRequest.toFixed(3),
  "server ELU": `${(result.serverEventLoopUtilization * 100).toFixed(1)}%`,
  "RSS MiB": result.serverRssMiB.toFixed(1)
})

const frameworks: ReadonlyArray<Framework> = ["Effect HttpServer", "Hono"]
const results: Array<RoundResult> = []

console.log("Effect HttpServer vs Hono: asynchronous filesystem HTTP API")
console.log({
  node: process.version,
  versions,
  git,
  sourceHash: sourceHash.slice(0, 16),
  cpu: cpus()[0]?.model ?? "unknown",
  logicalCpus: cpus().length,
  connections: config.connections,
  documentsPerOperation: config.documents,
  durationSeconds: config.durationMs / 1_000,
  payloadKiB: config.payloadBytes / 1_024,
  readPercent: config.readPercent,
  rounds: config.rounds,
  warmupSeconds: config.warmupMs / 1_000,
  corpusBaseDirectory
})

for (let round = 1; round <= config.rounds; round++) {
  const order = round % 2 === 1 ? frameworks : [...frameworks].reverse()
  for (let index = 0; index < order.length; index++) {
    const framework = order[index]
    process.stdout.write(`Round ${round}/${config.rounds}, ${framework}... `)
    const result = await runFramework(framework, round, index + 1)
    results.push(result)
    console.log(`${result.requestsPerSecond.toFixed(0)} req/s, p99 ${result.p99Ms.toFixed(2)} ms`)
  }
}

console.log("\nPer-round results")
console.table(results.map(formatRoundResult))

const summary = frameworks.map((framework) => {
  const selected = results.filter((result) => result.framework === framework)
  return {
    framework,
    "median req/s": median(selected.map((result) => result.requestsPerSecond)).toFixed(0),
    "median p50 ms": median(selected.map((result) => result.p50Ms)).toFixed(2),
    "median p99 ms": median(selected.map((result) => result.p99Ms)).toFixed(2),
    "median CPU ms/req": median(selected.map((result) => result.serverCpuMsPerRequest)).toFixed(3),
    "median server ELU": `${(median(selected.map((result) => result.serverEventLoopUtilization)) * 100).toFixed(1)}%`,
    errors: selected.reduce((total, result) => total + result.errors, 0)
  }
})
console.log("\nMedian summary")
console.table(summary)

const pairedRatios = Array.from({ length: config.rounds }, (_, index) => {
  const round = index + 1
  const effect = results.find((result) => result.round === round && result.framework === "Effect HttpServer")!
  const hono = results.find((result) => result.round === round && result.framework === "Hono")!
  return {
    round,
    throughput: effect.requestsPerSecond / hono.requestsPerSecond,
    p99: effect.p99Ms / hono.p99Ms
  }
})
console.log("\nPaired Effect / Hono ratios (1.0 means equal)")
console.table(pairedRatios.map((ratio) => ({
  round: ratio.round,
  throughput: ratio.throughput.toFixed(3),
  "p99 latency": ratio.p99.toFixed(3)
})))
console.log({
  medianThroughputRatio: median(pairedRatios.map((ratio) => ratio.throughput)).toFixed(3),
  medianP99LatencyRatio: median(pairedRatios.map((ratio) => ratio.p99)).toFixed(3)
})
console.log(
  "Results are exploratory. Inspect all paired rounds and variability; do not treat one run as a release claim."
)

if (config.jsonPath !== undefined) {
  if (config.jsonPath.length === 0) {
    throw new Error("--json requires a non-empty path")
  }
  const output = {
    generatedAt: new Date().toISOString(),
    system: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: cpus()[0]?.model ?? "unknown",
      logicalCpus: cpus().length
    },
    versions,
    git,
    sourceHash,
    corpusBaseDirectory,
    config,
    results,
    pairedRatios
  }
  await writeFile(config.jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8")
  console.log(`Raw results written to ${config.jsonPath}`)
}
