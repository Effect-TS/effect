import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Tracer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import type { HttpClientError } from "effect/http"
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability"
import * as Version from "effect/Version"

describe("OtlpTracer", () => {
  it.effect("uses effect as the instrumentation scope, not the service name", () => {
    const scopes: Array<{ name: string; version: string }> = []
    const httpClient = HttpClient.makeWith(
      Effect.fnUntraced(function*(requestEffect) {
        const request = yield* requestEffect
        assert(request.body._tag === "Uint8Array")
        const body = JSON.parse(new TextDecoder().decode(request.body.body))
        scopes.push(body.resourceSpans[0].scopeSpans[0].scope)
        return HttpClientResponse.fromWeb(request, new Response())
      }),
      Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
    )
    const layer = OtlpTracer.layer({
      url: "http://localhost:4318/v1/traces",
      resource: { serviceName: "test", serviceVersion: "service-version" },
      exportInterval: "1 hour"
    }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
    )
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("test"))
      yield* (yield* OtlpExporter.Flusher).flush
      assert.deepStrictEqual(scopes, [{ name: "effect", version: Version.getCurrentVersion() }])
    }).pipe(Effect.provide(layer))
  })

  it.effect("pads 64-bit trace ids to 32 hex characters", () => {
    const spans: Array<{ traceId: string; links: Array<{ traceId: string }> }> = []
    const httpClient = HttpClient.makeWith(
      Effect.fnUntraced(function*(requestEffect) {
        const request = yield* requestEffect
        assert(request.body._tag === "Uint8Array")
        const body = JSON.parse(new TextDecoder().decode(request.body.body))
        spans.push(...body.resourceSpans[0].scopeSpans[0].spans)
        return HttpClientResponse.fromWeb(request, new Response())
      }),
      Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
    )
    const layer = OtlpTracer.layer({
      url: "http://localhost:4318/v1/traces",
      resource: { serviceName: "test" },
      exportInterval: "1 hour"
    }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
    )
    const parent = Tracer.externalSpan({ traceId: "463ac35c9f6413ad", spanId: "0020000000000001" })
    return Effect.gen(function*() {
      yield* Effect.void.pipe(
        Effect.withSpan("test", { parent, links: [{ span: parent, attributes: {} }] })
      )
      yield* (yield* OtlpExporter.Flusher).flush
      assert.strictEqual(spans[0].traceId, "0000000000000000463ac35c9f6413ad")
      assert.strictEqual(spans[0].links[0].traceId, "0000000000000000463ac35c9f6413ad")
    }).pipe(Effect.provide(layer))
  })
})
