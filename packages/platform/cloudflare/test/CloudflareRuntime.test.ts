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
      tracing: undefined as { startSpan: () => void; withActiveSpan: () => void } | undefined,
      waitUntil: vi.fn()
    }
  }
})
vi.mock("cloudflare:workers", () => workers)

describe("CloudflareRuntime.layer", { concurrent: false }, () => {
  afterAll(() => vi.unstubAllGlobals())

  it.effect("installs the Cloudflare scheduler and tracer when both are supported", () =>
    Effect.gen(function*() {
      compatibilityFlags.handle_cross_request_promise_resolution = true
      workers.tracing = { startSpan: vi.fn(), withActiveSpan: vi.fn() }
      const context = yield* Layer.build(CloudflareRuntime.layer)
      assert.instanceOf(Context.get(context, Scheduler.Scheduler), CloudflareScheduler)
      assert.notStrictEqual(Context.get(context, Tracer.Tracer), Tracer.nativeTracer)
    }))

  it.effect("still installs the scheduler when tracing is unavailable", () =>
    Effect.gen(function*() {
      compatibilityFlags.handle_cross_request_promise_resolution = true
      workers.tracing = undefined
      const context = yield* Layer.build(CloudflareRuntime.layer)
      assert.instanceOf(Context.get(context, Scheduler.Scheduler), CloudflareScheduler)
      assert.strictEqual(Context.get(context, Tracer.Tracer), Tracer.nativeTracer)
    }))

  it.effect("keeps both Effect defaults when neither service is supported", () =>
    Effect.gen(function*() {
      compatibilityFlags.handle_cross_request_promise_resolution = false
      workers.tracing = undefined
      const context = yield* Layer.build(CloudflareRuntime.layer)
      assert.strictEqual(Context.get(context, Scheduler.Scheduler), Context.get(Context.empty(), Scheduler.Scheduler))
      assert.strictEqual(Context.get(context, Tracer.Tracer), Tracer.nativeTracer)
    }))
})
