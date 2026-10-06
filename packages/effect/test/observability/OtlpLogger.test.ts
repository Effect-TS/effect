import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Layer, Metric } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import type { HttpClientError, HttpClientRequest } from "effect/http"
import { OtlpExporter, OtlpLogger, OtlpMetrics, OtlpSerialization, OtlpTracer } from "effect/observability"

const capture = () => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const httpClient = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      requests.push(request)
      return HttpClientResponse.fromWeb(request, new Response())
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  return { requests, httpClient } as const
}

const bodyOf = (request: HttpClientRequest.HttpClientRequest) => {
  assert(request.body._tag === "Uint8Array")
  return JSON.parse(new TextDecoder().decode(request.body.body))
}

describe("OtlpLogger", () => {
  it.effect("records errors and Effect metadata with semantic conventions", () => {
    const { httpClient, requests } = capture()
    const layer = OtlpLogger.layer({
      url: "http://localhost:4318/v1/logs",
      resource: { serviceName: "test" },
      headers: { "User-Agent": "my-app/1.0" },
      exportInterval: "1 hour",
      mergeWithExisting: false
    }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provideMerge(Layer.succeed(HttpClient.HttpClient, httpClient))
    )
    return Effect.gen(function*() {
      yield* Effect.logError(
        "boom",
        Cause.combine(Cause.fail(new TypeError("bad input")), Cause.fail(new RangeError("second failure")))
      ).pipe(Effect.withLogSpan("op"))
      yield* (yield* OtlpExporter.Flusher).flush

      assert.strictEqual(requests.length, 1)
      assert.strictEqual(
        requests[0].headers["user-agent"],
        "my-app/1.0 OTel-OTLP-Exporter-JavaScript-Effect-OtlpLogger"
      )
      const scopeLogs = bodyOf(requests[0]).resourceLogs[0].scopeLogs[0]
      assert.strictEqual(scopeLogs.scope.name, "effect")
      const record = scopeLogs.logRecords[0]
      const attributes = Object.fromEntries(
        record.attributes.map((a: { key: string; value: Record<string, unknown> }) => [a.key, a.value])
      )
      assert.deepStrictEqual(attributes["exception.type"], { stringValue: "TypeError" })
      assert.deepStrictEqual(attributes["exception.message"], { stringValue: "bad input" })
      assert.include(attributes["exception.stacktrace"].stringValue, "second failure")
      assert.isNumber(attributes["effect.fiberId"].intValue)
      assert.isNumber(attributes["effect.log_span.op"].intValue)
      assert.isUndefined(attributes["log.error"])
      assert.isUndefined(attributes["fiberId"])
    }).pipe(Effect.provide(layer))
  })

  it.effect("uses the default User-Agent and the effect scope for traces and metrics", () => {
    const { httpClient, requests } = capture()
    const layer = Layer.mergeAll(
      OtlpTracer.layer({ url: "http://localhost:4318/v1/traces", exportInterval: "1 hour" }),
      OtlpMetrics.layer({ url: "http://localhost:4318/v1/metrics", exportInterval: "1 hour" })
    ).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provideMerge(Layer.succeed(HttpClient.HttpClient, httpClient))
    )
    return Effect.gen(function*() {
      yield* Effect.void.pipe(Effect.withSpan("span"))
      yield* Metric.update(Metric.counter("otlp_scope_test"), 1)
      yield* (yield* OtlpExporter.Flusher).flush

      const traces = requests.find((r) => r.url.endsWith("/v1/traces"))!
      const metrics = requests.find((r) => r.url.endsWith("/v1/metrics"))!
      assert.strictEqual(traces.headers["user-agent"], "OTel-OTLP-Exporter-JavaScript-Effect-OtlpTracer")
      assert.strictEqual(bodyOf(traces).resourceSpans[0].scopeSpans[0].scope.name, "effect")
      assert.strictEqual(bodyOf(metrics).resourceMetrics[0].scopeMetrics[0].scope.name, "effect")
    }).pipe(Effect.provide(layer))
  })
})
