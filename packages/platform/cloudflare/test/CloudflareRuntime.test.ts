import * as CloudflareRuntime from "@effect/platform-cloudflare/CloudflareRuntime"
import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
import { afterAll, assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Scheduler, Tracer } from "effect"
import { vi } from "vitest"

const { compatibilityFlags, workers } = vi.hoisted(() => {
  const compatibilityFlags = { handle_cross_request_promise_resolution: true }
  vi.stubGlobal("Cloudflare", { compatibilityFlags })
  return {
    compatibilityFlags,
    workers: {
      tracing: { startSpan: vi.fn(), withActiveSpan: undefined as (() => void) | undefined },
      waitUntil: vi.fn()
    }
  }
})
vi.mock("cloudflare:workers", () => workers)

describe("CloudflareRuntime.layer", { concurrent: false }, () => {
  afterAll(() => vi.unstubAllGlobals())

  it.effect("still installs the scheduler without tracing.withActiveSpan", () =>
    Effect.gen(function*() {
      compatibilityFlags.handle_cross_request_promise_resolution = true
      workers.tracing.withActiveSpan = undefined
      const context = yield* Layer.build(CloudflareRuntime.layer)
      assert.instanceOf(Context.get(context, Scheduler.Scheduler), CloudflareScheduler)
      assert.strictEqual(Context.get(context, Tracer.Tracer), Tracer.nativeTracer)
    }))

  it.effect("still installs the tracer when cross-request promise resolution is disabled", () =>
    Effect.gen(function*() {
      compatibilityFlags.handle_cross_request_promise_resolution = false
      workers.tracing.withActiveSpan = vi.fn()
      const context = yield* Layer.build(CloudflareRuntime.layer)
      assert.strictEqual(Context.get(context, Scheduler.Scheduler), Context.get(Context.empty(), Scheduler.Scheduler))
      assert.notStrictEqual(Context.get(context, Tracer.Tracer), Tracer.nativeTracer)
    }))
})
