import * as CloudflareDurableObjects from "@effect/platform-cloudflare/CloudflareDurableObjects"
import * as CloudflareRuntime from "@effect/platform-cloudflare/CloudflareRuntime"
import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Deferred, Effect, type Fiber, Layer, Logger, ManagedRuntime, Scheduler } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"

export { ClusterSingleton } from "@effect/platform-cloudflare/CloudflareDurableObjects"

let usedInitializerScheduler = false
const schedulerProbe = Logger.layer([
  Effect.map(Scheduler.Scheduler, (expected) =>
    Logger.make(({ fiber }) => {
      usedInitializerScheduler = expected instanceof CloudflareScheduler &&
        fiber.getRef(Scheduler.Scheduler) === expected
    }))
]).pipe(Layer.provideMerge(CloudflareRuntime.layer))
const runtime = ManagedRuntime.make(schedulerProbe)
CloudflareDurableObjects.setInitializer(() => runtime.context())

declare const WebSocketPair: new() => Record<0 | 1, { readyState: number }>

const als = new AsyncLocalStorage<string>()
const scheduler = new CloudflareScheduler()

// Counts the scheduler's pending timers, which never fire
const pendingTimers = new Set<unknown>()
const { clearTimeout, setTimeout } = globalThis
Object.assign(globalThis, {
  setTimeout(callback: () => void, millis?: number) {
    const timer = setTimeout(callback, millis)
    if (millis === 2_147_483_647) pendingTimers.add(timer)
    return timer
  },
  clearTimeout(timer: ReturnType<typeof setTimeout>) {
    pendingTimers.delete(timer)
    clearTimeout(timer)
  }
})

const deferred = Deferred.makeUnsafe<void>()
const log: Array<{ readonly store: string | undefined; readonly io: string }> = []
let fiber: Fiber.Fiber<unknown> | undefined

// The /park request owns a fiber that a /wake request wakes
export default {
  async fetch(request: Request, env: { SINGLETON: { getByName(name: string): { wake(): Promise<unknown> } } }) {
    switch (new URL(request.url).pathname) {
      case "/singleton-scheduler":
        // An unregistered singleton logs its failure from the wake method itself,
        // rather than from a handler with its own captured registration context.
        await env.SINGLETON.getByName("Singleton/unregistered").wake()
        return Response.json(usedInitializerScheduler)
      case "/park":
        return als.run("owner", () => {
          // I/O objects can only be used by the request that created them
          const pair = new WebSocketPair()
          fiber = Effect.runFork(
            Deferred.await(deferred).pipe(
              Effect.andThen(Effect.sleep(20)),
              Effect.andThen(Effect.sync(() => {
                let io: string
                try {
                  io = pair[0].readyState === 1 ? "owner" : "unknown"
                } catch {
                  io = "foreign"
                }
                log.push({ store: als.getStore(), io })
              }))
            ),
            { scheduler }
          )
          return new Response("parked")
        })
      case "/wake":
        return als.run("waker", async () => {
          await Effect.runPromise(Deferred.succeed(deferred, undefined), { scheduler })
          return new Response("woken")
        })
      case "/log":
        return Response.json({ log, exited: fiber!.pollUnsafe() !== undefined, timers: pendingTimers.size })
    }
    return new Response("not found", { status: 404 })
  }
}
