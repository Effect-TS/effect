import { CloudflareScheduler, layer } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Deferred, Effect, Fiber, Layer, ManagedRuntime } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"

declare const WebSocketPair: new() => Record<0 | 1, { readyState: number }>

const als = new AsyncLocalStorage<string>()
const scheduler = new CloudflareScheduler()

// Tracks the scheduler's pending timers, which never fire, by the test that
// set them, to check that each is cleared once its fiber resumes
const testIds = new AsyncLocalStorage<string>()
const pendingTimers = new Map<unknown, string | undefined>()
const pendingTimerCount = (id: string) => [...pendingTimers.values()].filter((owner) => owner === id).length
const { clearTimeout, setTimeout } = globalThis
Object.assign(globalThis, {
  setTimeout(callback: () => void, millis?: number) {
    const timer = setTimeout(callback, millis)
    if (millis === 2_147_483_647) pendingTimers.set(timer, testIds.getStore())
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
}
const slots = new Map<string, Slot>()

// Request A runs a fiber that request B wakes or interrupts
const handle = (url: URL): Promise<Response> => {
  const id = url.searchParams.get("id")!
  return testIds.run(id, () => route(url, id))
}

const route = async (url: URL, id: string): Promise<Response> => {
  switch (url.pathname) {
    case "/park":
    case "/background": {
      const slot: Slot = { log: [], deferred: Deferred.makeUnsafe() }
      slots.set(id, slot)
      return als.run("A", async () => {
        const probe = makeIoProbe()
        const note = (at: string) =>
          Effect.sync(() => {
            slot.log.push({ at, store: als.getStore(), io: probe() })
          })
        const parked = Deferred.await(slot.deferred).pipe(
          Effect.andThen(note("resumed")),
          Effect.andThen(Effect.sleep(20)),
          Effect.andThen(note("slept"))
        )
        const program = url.pathname === "/background"
          ? Effect.sleep(20).pipe(Effect.andThen(note("slept")))
          : parked
        const fiber = slot.fiber = Effect.runFork(program.pipe(Effect.onInterrupt(() => note("interrupted"))), {
          scheduler
        })
        if (url.searchParams.has("join")) {
          await Effect.runPromise(Fiber.await(fiber), { scheduler })
        }
        return Response.json(slot.log)
      })
    }
    case "/wake":
      return als.run("B", async () => {
        const slot = slots.get(id)!
        if (url.searchParams.has("interrupt")) {
          slot.fiber!.interruptUnsafe()
        } else {
          await Effect.runPromise(Deferred.succeed(slot.deferred, undefined), { scheduler })
        }
        return Response.json("woken")
      })
    case "/log": {
      const slot = slots.get(id)
      return slot === undefined
        ? new Response("not found", { status: 404 })
        : Response.json({
          log: slot.log,
          exited: slot.fiber!.pollUnsafe() !== undefined,
          timers: pendingTimerCount(id)
        })
    }
    case "/same": {
      // Woken by the same request, from another AsyncLocalStorage scope
      const deferred = Deferred.makeUnsafe<void>()
      const fiber = als.run("X", () =>
        Effect.runFork(
          Deferred.await(deferred).pipe(Effect.andThen(Effect.sync(() => als.getStore()))),
          { scheduler }
        ))
      await als.run("Y", () => Effect.runPromise(Deferred.succeed(deferred, undefined), { scheduler }))
      return Response.json(await Effect.runPromise(Fiber.join(fiber), { scheduler }))
    }
  }
  return new Response("not found", { status: 404 })
}

// A shared runtime whose initialization waits for another request
const ready = Deferred.makeUnsafe<void>()
const runtime = ManagedRuntime.make(Layer.effectDiscard(Deferred.await(ready)).pipe(Layer.provideMerge(layer)))
let initialized = false

// Requests to a Durable Object share one I/O context
export class Room {
  fetch(request: Request) {
    return handle(new URL(request.url))
  }
}

export default {
  async fetch(
    request: Request,
    env: {
      readonly ROOM: {
        idFromName(name: string): unknown
        get(id: unknown): { fetch(request: Request): Promise<Response> }
      }
    }
  ) {
    const url = new URL(request.url)
    if (url.pathname.startsWith("/runtime/")) {
      return testIds.run("runtime", () => runtimeRoute(url))
    }
    if (url.pathname.startsWith("/room/")) {
      const room = env.ROOM.get(env.ROOM.idFromName("room"))
      return room.fetch(new Request(new URL(url.pathname.slice(5) + url.search, url), request))
    }
    return handle(url)
  }
}

const runtimeRoute = async (url: URL): Promise<Response> => {
  switch (url.pathname) {
    // Starts initializing the runtime and responds without waiting for it
    case "/runtime/start": {
      als.run("A", () =>
        runtime.runFork(
          Effect.sync(() => {
            initialized = true
          }),
          { scheduler }
        ))
      return Response.json(initialized)
    }
    // Waits for the initialization another request started
    case "/runtime/join":
      return als.run(
        "B",
        async () => Response.json(await runtime.runPromise(Effect.sync(() => als.getStore()), { scheduler }))
      )
    // Lets the initialization finish
    case "/runtime/ready":
      await Effect.runPromise(Deferred.succeed(ready, undefined), { scheduler })
      return Response.json("ready")
    case "/runtime/status":
      return Response.json({ initialized, timers: pendingTimerCount("runtime") })
  }
  return new Response("not found", { status: 404 })
}
