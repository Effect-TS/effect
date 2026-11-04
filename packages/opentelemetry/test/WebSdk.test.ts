import * as WebSdk from "@effect/opentelemetry/WebSdk"
import { assert, describe, it } from "@effect/vitest"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace"
import * as Effect from "effect/Effect"

describe("WebSdk", () => {
  it.effect("exports spans with the configured service resource", () => {
    const exporter = new InMemorySpanExporter()
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("test"))
      const spans = exporter.getFinishedSpans()
      assert.strictEqual(spans.length, 1)
      assert.strictEqual(spans[0]!.name, "test")
      assert.strictEqual(spans[0]!.resource.attributes["service.name"], "web-service")
    }).pipe(
      Effect.provide(WebSdk.layer(() => ({
        resource: { serviceName: "web-service" },
        spanProcessor: new SimpleSpanProcessor({ exporter })
      })))
    )
  })
})
