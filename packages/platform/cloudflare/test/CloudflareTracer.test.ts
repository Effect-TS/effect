import * as CloudflareTracer from "@effect/platform-cloudflare/CloudflareTracer"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { HttpTraceContext } from "effect/http"
import { AsyncLocalStorage } from "node:async_hooks"

// A stand-in for Cloudflare's `tracing` API (`import { tracing } from
// "cloudflare:workers"`, or `ctx.tracing`). As in the Workers runtime:
//
// - the active span lives on the async context, and a new span becomes a child
//   of it, or of the invocation's root span when none is active
// - a span can only be used by the invocation that created it
// - an invocation can be unrecorded, and then its spans report `isTraced: false`
//   and all-zero ids
const makeTracing = (options?: { readonly traced?: boolean }) => {
  const traceId = "0af7651916cd43dd8448eb211c80319c"
  const active = new AsyncLocalStorage<FakeSpan>()
  const spans: Array<FakeSpan> = []
  let invocation = 1
  let traced = options?.traced ?? true

  class FakeSpan {
    readonly isTraced = traced
    readonly invocation = invocation
    readonly spanId = (spans.length + 1).toString(16).padStart(16, "0")
    readonly attributes: Record<string, string | number | boolean> = {}
    readonly exceptions: Array<{ readonly name?: string; readonly message?: string }> = []
    status: { readonly code: string; readonly message?: string } = { code: "unset" }
    ended = false
    readonly name: string
    readonly parent: FakeSpan | undefined
    constructor(name: string, parent: FakeSpan | undefined) {
      this.name = name
      this.parent = parent
    }
    get path(): string {
      return this.parent === undefined ? this.name : `${this.parent.path} > ${this.name}`
    }
    get isCurrent(): boolean {
      return this.invocation === invocation
    }
    assertCurrent(): void {
      if (!this.isCurrent) {
        throw new Error("Cannot perform I/O on behalf of a different request.")
      }
    }
    spanContext() {
      this.assertCurrent()
      return this.isTraced
        ? { traceId, spanId: this.spanId, traceFlags: 0 }
        : { traceId: "0".repeat(32), spanId: "0".repeat(16), traceFlags: 0 }
    }
    setAttribute(key: string, value: string | number | boolean) {
      this.assertCurrent()
      this.attributes[key] = value
      return this
    }
    recordException(exception: { readonly name?: string; readonly message?: string }) {
      this.assertCurrent()
      this.exceptions.push(exception)
    }
    setStatus(status: { readonly code: string; readonly message?: string }) {
      this.assertCurrent()
      this.status = status
      return this
    }
    end() {
      this.assertCurrent()
      this.ended = true
    }
  }

  let root = new FakeSpan("request-1", undefined)

  return {
    spans,
    /** Ends the current invocation and starts the next one in the same isolate. */
    nextInvocation() {
      invocation++
      traced = true
      root = new FakeSpan(`request-${invocation}`, undefined)
    },
    tracing: {
      startSpan(name: string) {
        const parent = active.getStore()
        const span = new FakeSpan(name, parent?.isCurrent ? parent : root)
        spans.push(span)
        return span
      },
      withActiveSpan<T>(span: FakeSpan, callback: () => T): T {
        span.assertCurrent()
        return active.run(span, callback)
      }
    }
  }
}

describe("CloudflareTracer", () => {
  it.effect("records Effect spans as Cloudflare spans nested under the invocation", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()

      yield* Effect.void.pipe(
        Effect.withSpan("load-user", { attributes: { "user.id": 42 } }),
        Effect.withSpan("handle-request"),
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      assert.deepStrictEqual(cloudflare.spans.map((span) => span.path), [
        "request-1 > handle-request",
        "request-1 > handle-request > load-user"
      ])
      assert.deepStrictEqual(cloudflare.spans[1].attributes, { "user.id": 42 })
      assert.deepStrictEqual(cloudflare.spans.map((span) => span.ended), [true, true])
    }))

  it.effect("gives Effect spans the trace and span ids Cloudflare assigned", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()

      const span = yield* Effect.currentSpan.pipe(
        Effect.withSpan("handle-request"),
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      assert.strictEqual(span.traceId, "0af7651916cd43dd8448eb211c80319c")
      assert.strictEqual(span.spanId, "0000000000000001")
    }))

  it.effect("nests spans the Workers runtime creates under the current Effect span", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()
      // The runtime instruments fetch and binding calls with spans of its own.
      const kvGet = Effect.sync(() => cloudflare.tracing.startSpan("kv_get").end())

      yield* Effect.yieldNow.pipe(
        Effect.andThen(kvGet),
        Effect.withSpan("load-user"),
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      assert.deepStrictEqual(cloudflare.spans.map((span) => span.path), [
        "request-1 > load-user",
        "request-1 > load-user > kv_get"
      ])
    }))

  it.effect("reports a failed Effect span as an error with its exception", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()

      yield* Effect.fail(new Error("card declined")).pipe(
        Effect.withSpan("charge-card"),
        Effect.exit,
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      const span = cloudflare.spans[0]
      assert.deepStrictEqual(span.status, { code: "error", message: "card declined" })
      assert.deepStrictEqual(span.exceptions.map((exception) => exception.message), ["card declined"])
      assert.isTrue(span.ended)
    }))

  it.effect("marks a span ended by interruption as interrupted rather than failed", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()

      yield* Effect.interrupt.pipe(
        Effect.withSpan("long-poll"),
        Effect.exit,
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      const span = cloudflare.spans[0]
      assert.deepStrictEqual(span.attributes, { "effect.fiber.interrupted": true })
      assert.deepStrictEqual(span.status, { code: "unset" })
      assert.deepStrictEqual(span.exceptions, [])
      assert.isTrue(span.ended)
    }))

  it.effect("records no Cloudflare span for an unsampled span and nests its work under the sampled parent", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()
      const kvGet = Effect.sync(() => cloudflare.tracing.startSpan("kv_get").end())

      const span = yield* Effect.yieldNow.pipe(
        Effect.andThen(kvGet),
        Effect.andThen(Effect.currentSpan),
        Effect.withSpan("debug-step", { sampled: false }),
        Effect.withSpan("handle-request"),
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      assert.deepStrictEqual(cloudflare.spans.map((span) => span.path), [
        "request-1 > handle-request",
        "request-1 > handle-request > kv_get"
      ])
      // Outgoing requests still carry a valid, unsampled trace context.
      const propagated = HttpTraceContext.w3c(HttpTraceContext.toHeaders(span))
      assert.isTrue(Option.isSome(propagated))
      assert.strictEqual(propagated.pipe(Option.map((parent) => parent.sampled), Option.getOrUndefined), false)
    }))

  it.effect("keeps the caller's AsyncLocalStorage values under a span created elsewhere", () =>
    Effect.gen(function*() {
      const cloudflare = makeTracing()
      const tracer = CloudflareTracer.layer({ tracing: cloudflare.tracing })
      const store = new AsyncLocalStorage<string>()

      const outer = yield* Effect.makeSpan("outer").pipe(Effect.provide(tracer))
      const value = yield* Effect.promise(() =>
        store.run("caller", () =>
          Effect.runPromise(
            Effect.sync(() => store.getStore()).pipe(Effect.withParentSpan(outer), Effect.provide(tracer))
          ))
      )

      assert.strictEqual(value, "caller")
    }))

  it.effect("keeps running an effect whose span outlived its invocation", () =>
    Effect.gen(function*() {
      // The first invocation is unrecorded, which must not stop the next one
      // from recording.
      const cloudflare = makeTracing({ traced: false })

      // A span opened in one invocation, such as a `Layer.span` built together
      // with the runtime, is still current when later invocations run.
      const background = yield* Effect.sync(() => cloudflare.nextInvocation()).pipe(
        Effect.andThen(Effect.void.pipe(Effect.withSpan("refresh-cache"))),
        Effect.andThen(Effect.currentSpan),
        Effect.withSpan("background"),
        Effect.provide(CloudflareTracer.layer({ tracing: cloudflare.tracing }))
      )

      assert.deepStrictEqual(cloudflare.spans.map((span) => span.path), [
        "request-1 > background",
        "request-2 > refresh-cache"
      ])
      // Cloudflare gives unrecorded spans all-zero ids, which are not valid to propagate.
      assert.isTrue(Option.isSome(HttpTraceContext.w3c(HttpTraceContext.toHeaders(background))))
    }))
})
