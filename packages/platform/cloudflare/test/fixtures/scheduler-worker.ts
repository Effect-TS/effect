import { CloudflareScheduler, layer } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Deferred, Effect, Fiber, Layer, ManagedRuntime } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"

declare const WebSocketPair: new() => Record<0 | 1, { readyState: number }>

const als = new AsyncLocalStorage<string>()
const scheduler = new CloudflareScheduler()

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
const handle = async (url: URL): Promise<Response> => {
  const id = url.searchParams.get("id")!
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
        // Work of the owner's own, which keeps it running while it waits
        const work = url.searchParams.get("work")
        const program = url.pathname === "/background"
          ? Effect.sleep(20).pipe(Effect.andThen(note("slept")))
          : work === null
          ? parked
          : Effect.race(parked, Effect.sleep(Number(work)).pipe(Effect.andThen(Effect.never)))
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
        : Response.json({ log: slot.log, exited: slot.fiber!.pollUnsafe() !== undefined })
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

// A shared runtime whose initialization takes a while
const runtime = ManagedRuntime.make(Layer.effectDiscard(Effect.sleep(100)).pipe(Layer.provideMerge(layer)))
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
      case "/runtime/status":
        return Response.json(initialized)
    }
    if (url.pathname.startsWith("/room/")) {
      const room = env.ROOM.get(env.ROOM.idFromName("room"))
      return room.fetch(new Request(new URL(url.pathname.slice(5) + url.search, url), request))
    }
    return handle(url)
  }
}
