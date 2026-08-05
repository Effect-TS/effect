import * as Resource from "@effect/opentelemetry/Resource"
import * as WebSdk from "@effect/opentelemetry/WebSdk"
import { assert, it } from "@effect/vitest"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import { Effect, Layer } from "effect"

it.effect("shuts down the Web provider after forceFlush rejects", () =>
  Effect.gen(function*() {
    let shutdowns = 0
    const originalFlush = WebTracerProvider.prototype.forceFlush
    const originalShutdown = WebTracerProvider.prototype.shutdown
    WebTracerProvider.prototype.forceFlush = () => Promise.reject(new Error("flush failed"))
    WebTracerProvider.prototype.shutdown = () => {
      shutdowns++
      return Promise.resolve()
    }
    const processor = { onStart() {}, onEnd() {}, shutdown: async () => {}, forceFlush: async () => {} } as any
    yield* Effect.exit(Effect.scoped(Layer.build(WebSdk.layerTracerProvider(processor)).pipe(Effect.provide(Resource.layerEmpty))))
    WebTracerProvider.prototype.forceFlush = originalFlush
    WebTracerProvider.prototype.shutdown = originalShutdown
    assert.strictEqual(shutdowns, 1)
  }))
