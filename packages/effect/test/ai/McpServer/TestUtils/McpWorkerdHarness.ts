import { vi } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import { AsyncLocalStorage } from "node:async_hooks"

export interface WorkerdResponse {
  readonly status: number
  readonly headers: Headers
  readonly body: string
}

// The scheduler detects Cloudflare Workers when its module loads, so load a
// fresh copy while the Workers user agent is visible.
const loadWorkersScheduler = Effect.promise(async () => {
  const navigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "Cloudflare-Workers" },
    configurable: true,
    writable: true
  })
  try {
    vi.resetModules()
    const { MixedScheduler } = await import("effect/Scheduler")
    return new MixedScheduler()
  } finally {
    if (navigator === undefined) {
      delete (globalThis as any).navigator
    } else {
      Object.defineProperty(globalThis, "navigator", navigator)
    }
  }
})

/**
 * Serves requests like a Cloudflare Workers isolate: the app is built while
 * the first request is served, with the scheduler the Workers runtime gets by
 * default, and a `setImmediate` belongs to the request that set it. Once a
 * request has finished sending its body, its pending callbacks never fire.
 */
export const makeWorkerdHarness = Effect.fnUntraced(function*<A, E>(
  serverLayer: Layer.Layer<A, E, HttpRouter.HttpRouter>
) {
  const owners = new AsyncLocalStorage<{ completed: boolean }>()
  const realSetImmediate = globalThis.setImmediate
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      globalThis.setImmediate = ((callback: (...args: Array<any>) => void, ...args: Array<any>) => {
        const owner = owners.getStore()
        return realSetImmediate(() => {
          if (owner?.completed !== true) callback(...args)
        })
      }) as typeof setImmediate
    }),
    () =>
      Effect.sync(() => {
        globalThis.setImmediate = realSetImmediate
      })
  )
  const scheduler = yield* loadWorkersScheduler
  const appLayer = serverLayer.pipe(
    Layer.provideMerge(Layer.succeed(Scheduler.Scheduler, scheduler))
  )
  let app: {
    readonly handler: (request: Request) => Promise<Response>
    readonly dispose: () => Promise<void>
  } | undefined
  yield* Effect.addFinalizer(() => Effect.promise(() => app?.dispose() ?? Promise.resolve()))

  const request = (input: Request): Effect.Effect<WorkerdResponse> =>
    Effect.promise((signal) => {
      const owner = { completed: false }
      signal.addEventListener("abort", () => {
        owner.completed = true
      })
      return owners.run(owner, async () => {
        try {
          app ??= HttpRouter.toWebHandler(appLayer, { disableLogger: true })
          const response = await app.handler(input)
          // A Workers request completes once its whole body, including SSE, is sent.
          const body = await response.text()
          return { status: response.status, headers: response.headers, body }
        } finally {
          owner.completed = true
        }
      })
    })

  return { request } as const
})
