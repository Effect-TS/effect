/**
 * Cost of registering a request fiber in the serve scope before its first
 * step (wrapped in `uninterruptible`) versus after `runForkWith` returns, as
 * the Bun and Deno HTTP adapters do. Not part of the test suite.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"
import process from "node:process"
import { Bench } from "tinybench"

const label = process.env.BENCH_LABEL ?? "unknown"
const runtime = typeof (globalThis as any).Bun !== "undefined"
  ? `bun ${(globalThis as any).Bun.version}`
  : typeof (globalThis as any).Deno !== "undefined"
  ? `deno ${(globalThis as any).Deno.version.deno}`
  : `node ${process.version}`

const scope = Scope.makeUnsafe()
const context = Context.empty()
const sync = Effect.succeed(1)
const yielding = Effect.andThen(Effect.yieldNow, Effect.succeed(1))

const owned = (effect: Effect.Effect<number>) =>
  Effect.uninterruptible(Effect.withFiber((fiber) => {
    Fiber.runIn(fiber, scope)
    return effect
  }))
const ownedSync = owned(sync)
const ownedYielding = owned(yielding)

const bench = new Bench({ time: 1500, warmupTime: 500 })
bench
  .add("sync: runIn after fork", () => {
    Fiber.runIn(Effect.runForkWith(context)(sync), scope)
  })
  .add("sync: runIn before first step", () => {
    Effect.runForkWith(context)(ownedSync)
  })
  .add("yielding: runIn after fork", async () => {
    await Effect.runPromise(Fiber.join(Fiber.runIn(Effect.runForkWith(context)(yielding), scope)))
  })
  .add("yielding: runIn before first step", async () => {
    await Effect.runPromise(Fiber.join(Effect.runForkWith(context)(ownedYielding)))
  })

await bench.run()
for (const task of bench.tasks) {
  const result = task.result!
  if (!("latency" in result)) throw new Error(`${task.name} aborted`)
  const latency = result.latency
  console.log(JSON.stringify({
    label,
    runtime,
    task: task.name,
    samples: latency.samplesCount,
    meanUs: Number((latency.mean * 1000).toFixed(3)),
    medianUs: Number((latency.p50! * 1000).toFixed(3)),
    rmePercent: Number(latency.rme.toFixed(1))
  }))
}
