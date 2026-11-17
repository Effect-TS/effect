import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Context, Deferred, Effect, type Fiber, Scheduler } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"

declare const WebSocketPair: new() => Record<0 | 1, { readyState: number }>

const als = new AsyncLocalStorage<string>()
const scheduler = new CloudflareScheduler()
const otherScheduler = new Scheduler.MixedScheduler("sync")

// Tracks the scheduler's pending timers, which never fire, by the owner that
// set them, to check that each is cleared once its fiber resumes
const pendingTimers = new Map<unknown, string | undefined>()
const { clearTimeout, setTimeout } = globalThis
Object.assign(globalThis, {
  setTimeout(callback: () => void, millis?: number) {
    const timer = setTimeout(callback, millis)
    if (millis === 2_147_483_647) pendingTimers.set(timer, als.getStore())
    return timer
  },
  clearTimeout(timer: ReturnType<typeof setTimeout>) {
    pendingTimers.delete(timer)
    clearTimeout(timer)
  }
})

// I/O objects can only be used by the request that created them
const makeIoProbe = () => {
  const pair = new WebSocketPair()
  return () => {
    try {
      return pair[0].readyState === 1 ? "owner" : "unknown"
    } catch {
      return "foreign"
    }
  }
}

interface Slot {
  readonly log: Array<{ readonly at: string; readonly store: string | undefined; readonly io: string }>
  readonly deferred: Deferred.Deferred<void>
  fiber?: Fiber.Fiber<unknown>
  wake?: () => void
  finish?: () => void
}
const slots = new Map<string, Slot>()

// The /park request owns a fiber, running in the store `id`, that a /wake
// request wakes or interrupts from the store "waker"
export default {
  async fetch(request: Request) {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")!
    switch (url.pathname) {
      case "/park": {
        const slot: Slot = { log: [], deferred: Deferred.makeUnsafe() }
        slots.set(id, slot)
        return als.run(id, () => {
          const probe = makeIoProbe()
          const note = (at: string) =>
            Effect.sync(() => {
              slot.log.push({ at, store: als.getStore(), io: probe() })
            })
          const wait = url.searchParams.has("owner-wake")
            // Woken by a promise reaction in the owner, with a cleanup that
            // waits for /finish
            ? Effect.callback<void>((resume) => {
              new Promise<void>((resolve) => {
                slot.wake = resolve
              }).then(() => resume(Effect.void))
              return note("cleanup").pipe(
                Effect.andThen(Effect.callback<void>((finish) => {
                  slot.finish = () => finish(Effect.void)
                })),
                Effect.andThen(note("cleaned"))
              )
            })
            : Deferred.await(slot.deferred)
          slot.fiber = Effect.runFork(
            wait.pipe(
              Effect.andThen(note("resumed")),
              Effect.andThen(Effect.sleep(20)),
              Effect.andThen(note("slept")),
              Effect.onInterrupt(() => note("interrupted"))
            ),
            { scheduler }
          )
          return Response.json(slot.log)
        })
      }
      case "/wake":
        return als.run("waker", async () => {
          const slot = slots.get(id)!
          const interrupt = url.searchParams.has("interrupt")
          if (url.searchParams.has("finish")) {
            slot.finish!()
            return Response.json("woken")
          }
          // Wakes the fiber first, so the interrupt arrives before the owner
          // has run it
          if (interrupt) slot.wake!()
          if (url.searchParams.has("move")) {
            // Gives the suspended fiber another scheduler
            slot.fiber!.setContext(Context.add(slot.fiber!.context, Scheduler.Scheduler, otherScheduler))
          }
          if (interrupt) {
            slot.fiber!.interruptUnsafe()
          } else {
            await Effect.runPromise(Deferred.succeed(slot.deferred, undefined), { scheduler })
          }
          return Response.json("woken")
        })
      case "/log": {
        const slot = slots.get(id)!
        return Response.json({
          log: slot.log,
          exited: slot.fiber!.pollUnsafe() !== undefined,
          timers: [...pendingTimers.values()].filter((owner) => owner === id).length
        })
      }
    }
    return new Response("not found", { status: 404 })
  }
}
