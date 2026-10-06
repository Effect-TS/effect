import { assert, describe, it } from "@effect/vitest"
import { Cause, Clock, Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import type { HttpClientError, HttpClientRequest } from "effect/http"
import { OtlpExporter, OtlpLogger, OtlpSerialization } from "effect/observability"
import { TestClock } from "effect/testing"

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

const makeTestLayer = (httpClient: HttpClient.HttpClient) =>
  OtlpLogger.layer({
    url: "http://localhost:4318/v1/logs",
    resource: { serviceName: "test" },
    exportInterval: "1 hour",
    mergeWithExisting: false
  }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
  )

const attributesOf = (request: HttpClientRequest.HttpClientRequest) =>
  Object.fromEntries(
    bodyOf(request).resourceLogs[0].scopeLogs[0].logRecords[0].attributes.map(
      (attribute: { key: string; value: Record<string, unknown> }) => [attribute.key, attribute.value]
    )
  )

describe("OtlpLogger", () => {
  it.effect("keeps event time separate from observed time", () => {
    const { httpClient, requests } = capture()
    return Effect.scoped(Effect.gen(function*() {
      const logger = yield* OtlpLogger.make({
        url: "http://localhost:4318/v1/logs",
        resource: { serviceName: "test" },
        exportInterval: "1 hour"
      })
      const fiber = yield* Effect.fiber
      const observedTime = yield* Clock.currentTimeNanos
      logger.log({
        fiber,
        message: "test",
        logLevel: "Info",
        cause: Cause.empty,
        date: new Date(1234)
      })
      yield* (yield* OtlpExporter.Flusher).flush

      const record = bodyOf(requests[0]).resourceLogs[0].scopeLogs[0].logRecords[0]
      assert.strictEqual(record.timeUnixNano, "1234000000")
      assert.strictEqual(record.observedTimeUnixNano, observedTime.toString())
    })).pipe(
      Effect.provide(OtlpExporter.layerFlusher),
      Effect.provide(OtlpSerialization.layerJson),
      Effect.provideService(HttpClient.HttpClient, httpClient)
    )
  })

  it.effect("records structured exception attributes", () => {
    const { httpClient, requests } = capture()
    return Effect.gen(function*() {
      yield* Effect.logError(
        "boom",
        Cause.combine(Cause.fail(new TypeError("bad input")), Cause.fail(new RangeError("second failure")))
      )
      yield* (yield* OtlpExporter.Flusher).flush

      assert.lengthOf(requests, 1)
      const attributes = attributesOf(requests[0])
      assert.deepStrictEqual(attributes["exception.type"], { stringValue: "TypeError" })
      assert.deepStrictEqual(attributes["exception.message"], { stringValue: "bad input" })
      assert.include(attributes["exception.stacktrace"].stringValue, "second failure")
      assert.isUndefined(attributes["log.error"])
    }).pipe(Effect.provide(makeTestLayer(httpClient)))
  })

  it.effect("namespaces fiber and log-span attributes", () => {
    const { httpClient, requests } = capture()
    return Effect.gen(function*() {
      yield* Effect.gen(function*() {
        yield* TestClock.adjust("12 millis")
        yield* Effect.log("test")
      }).pipe(Effect.withLogSpan("op"))
      yield* (yield* OtlpExporter.Flusher).flush

      const attributes = attributesOf(requests[0])
      assert.isNumber(attributes["effect.fiberId"].intValue)
      assert.deepStrictEqual(attributes["effect.log_span.op"], { intValue: 12 })
      assert.isUndefined(attributes["fiberId"])
      assert.isUndefined(attributes["logSpan.op"])
      assert.isUndefined(attributes["exception.type"])
    }).pipe(Effect.provide(makeTestLayer(httpClient)))
  })

  it.effect("uses effect as the instrumentation scope, not the service name", () => {
    const { httpClient, requests } = capture()
    return Effect.gen(function*() {
      yield* Effect.log("test")
      yield* (yield* OtlpExporter.Flusher).flush

      assert.strictEqual(bodyOf(requests[0]).resourceLogs[0].scopeLogs[0].scope.name, "effect")
    }).pipe(Effect.provide(makeTestLayer(httpClient)))
  })
})
