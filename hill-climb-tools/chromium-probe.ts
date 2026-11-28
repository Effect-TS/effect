// Runs in a real Chromium page via chromium-verify.mjs. Checks the browser
// scheduler path: postTask yields, priority order, interruption, partial
// scheduler globals, and how a throwing task is reported.
import { Effect, Fiber, Scheduler } from "effect"

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export const run = async () => {
  const g = globalThis as any
  const hasPostTask = typeof g.scheduler?.postTask === "function"

  const yields = 100
  let start = performance.now()
  await Effect.runPromise(Effect.forEach(Array.from({ length: yields }), () => Effect.yieldNow))
  const yieldMs = performance.now() - start

  const order: Array<string> = []
  const dispatcher = new Scheduler.MixedScheduler().makeDispatcher()
  dispatcher.scheduleTask(() => order.push("p5-1"), 5)
  dispatcher.scheduleTask(() => order.push("p0-1"), 0)
  dispatcher.scheduleTask(() => order.push("p-1"), -1)
  dispatcher.scheduleTask(() => order.push("p0-2"), 0)
  while (order.length < 4) await macrotask()

  let finalized = false
  const fiber = Effect.runFork(Effect.scoped(Effect.gen(function*() {
    yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => { finalized = true }))
    while (true) yield* Effect.yieldNow
  })))
  await macrotask()
  const exit = await Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber))))
  const interrupted = exit._tag === "Failure" && exit.cause.reasons.every((r) => r._tag === "Interrupt")

  // A scheduler global without postTask falls back to setTimeout
  Object.defineProperty(g.scheduler, "postTask", { value: undefined, configurable: true })
  start = performance.now()
  const fallback = await Effect.runPromise(Effect.as(Effect.yieldNow, "ok"))
  const fallbackMs = performance.now() - start
  delete g.scheduler.postTask
  const restored = typeof g.scheduler?.postTask === "function"

  dispatcher.scheduleTask(() => { throw new Error("chromium-task-boom") }, 0)
  await macrotask()
  await macrotask()

  return { hasPostTask, yields, yieldMs, order, finalized, interrupted, fallback, fallbackMs, restored }
}
