import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import { assert, it } from "@effect/vitest"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { Effect, Layer } from "effect"

it.effect("shuts down the Node provider after forceFlush rejects", () =>
  Effect.gen(function*() {
    let shutdowns = 0
    const originalFlush = NodeTracerProvider.prototype.forceFlush
    const originalShutdown = NodeTracerProvider.prototype.shutdown
    NodeTracerProvider.prototype.forceFlush = () => Promise.reject(new Error("flush failed"))
    NodeTracerProvider.prototype.shutdown = () => {
      shutdowns++
      return Promise.resolve()
    }
    const processor = {
      onStart() {},
      onEnd() {},
      shutdown: () => Promise.resolve(),
      forceFlush: () => Promise.resolve()
    } as any
    yield* Effect.exit(
      Effect.scoped(Layer.build(NodeSdk.layerTracerProvider(processor)).pipe(Effect.provide(Resource.layerEmpty)))
    ).pipe(
      Effect.ensuring(Effect.sync(() => {
        NodeTracerProvider.prototype.forceFlush = originalFlush
        NodeTracerProvider.prototype.shutdown = originalShutdown
      }))
    )
    assert.strictEqual(shutdowns, 1)
  }))
