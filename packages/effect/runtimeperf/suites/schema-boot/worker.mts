import assert from "node:assert/strict"
import { writeFileSync } from "node:fs"
import { Session } from "node:inspector/promises"
import { pathToFileURL } from "node:url"

// Usage: worker.mts <bundle> <size> <time|heap|profile> [warmMs] [profilePrefix]
const [bundlePath, size, mode, warmArgument = "300", profilePrefix] = process.argv.slice(2)
assert.ok(mode === "time" || mode === "heap" || mode === "profile")
const warmMs = Number(warmArgument)
const now = () => Number(process.hrtime.bigint()) / 1e6
const cpuNow = () => {
  const { user, system } = process.threadCpuUsage()
  return (user + system) / 1e3
}
const gc = (globalThis as any).gc as (() => void) | undefined
assert.ok(mode !== "heap" || gc, "heap mode requires --expose-gc")

const heap = () => {
  gc!()
  gc!()
  return process.memoryUsage().heapUsed
}

// Node loads its fetch and stream internals on first use. Load them before
// timing so the first request does not measure Node's own lazy loading.
await new Response(new Request("http://localhost/", { method: "POST", body: "{}" }).body).json()
new TextEncoder().encode("")

const session = new Session()
if (mode === "profile") {
  session.connect()
  await session.post("Profiler.enable")
  await session.post("Profiler.setSamplingInterval", { interval: 100 })
}

const timings: Record<string, number> = {}
const cpu: Record<string, number> = {}
const heapUsed: Record<string, number> = {}
const profiles: Array<string> = []

const phase = async (name: string, run: () => unknown) => {
  if (mode === "profile") await session.post("Profiler.start")
  const start = now()
  const cpuStart = cpuNow()
  const result: any = run()
  if (typeof result?.then === "function") await result
  timings[name] = now() - start
  // Thread CPU time can read zero for phases shorter than its resolution.
  cpu[name] = Math.max(cpuNow() - cpuStart, 0.001)
  if (mode === "profile") {
    const { profile } = await session.post("Profiler.stop")
    const path = `${profilePrefix}-${name}.cpuprofile`
    writeFileSync(path, JSON.stringify(profile))
    profiles.push(path)
  }
  if (mode === "heap") heapUsed[name] = heap()
}

if (mode === "heap") heapUsed.start = heap()
let module: any
await phase("import", async () => {
  module = await import(pathToFileURL(bundlePath).href)
})
const workload = module.createWorkload(size)
await phase("define", () => workload.define())
for (const [name, run] of Object.entries(workload.phases as Record<string, () => unknown>)) {
  await phase(name, run)
}

let warm: { ops: number; nsPerOp: number } | undefined
if (mode === "time" && workload.warm && warmMs > 0) {
  const loop = async (duration: number) => {
    let ops = 0
    const start = now()
    let elapsed = 0
    while ((elapsed = now() - start) < duration) {
      for (let index = 0; index < 16; index++) {
        const result = workload.warm()
        if (typeof result?.then === "function") await result
      }
      ops += 16
    }
    return { ops, elapsed }
  }
  await loop(warmMs / 2)
  const { elapsed, ops } = await loop(warmMs)
  warm = { ops, nsPerOp: (elapsed * 1e6) / ops }
}
assert.ok(workload.retained())
await workload.dispose?.()
session.disconnect()
process.stdout.write(JSON.stringify({ timings, cpu, heapUsed, warm, profiles }))
