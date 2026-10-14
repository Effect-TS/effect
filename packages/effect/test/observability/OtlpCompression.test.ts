import { assert, describe, it } from "@effect/vitest"
import { Cause, ConfigProvider, Deferred, Effect, Exit, Fiber, Layer, Metric } from "effect"
import { HttpBody, HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"
import { Otlp, OtlpExporter, OtlpSerialization } from "effect/observability"
import { TestClock } from "effect/testing"
import { vi } from "vitest"

const signals = ["logs", "metrics", "traces"] as const
const largeServiceName = "compression-service-".repeat(150)
const capture = (respond: (attempt: number) => Response = () => new Response()) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const httpClient = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      requests.push(request)
      return HttpClientResponse.fromWeb(request, respond(requests.length))
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  return { requests, httpClient }
}

const bytesOf = (request: HttpClientRequest.HttpClientRequest) => {
  assert(request.body._tag === "Uint8Array")
  return request.body.body
}

const uncompressed = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.promise(async () => {
    const bytes = bytesOf(request)
    if (request.headers["content-encoding"] !== "gzip") return bytes
    assert.deepStrictEqual(Array.from(bytes.subarray(0, 2)), [0x1f, 0x8b])
    return new Uint8Array(
      await new Response(
        new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"))
      ).arrayBuffer()
    )
  })

// Read length-delimited protobuf fields while skipping the scalar wire types.
// This checks the actual signal payload rather than interpreting protobuf as text.
const fields = (bytes: Uint8Array, wanted: number): Array<Uint8Array> => {
  let offset = 0
  const varint = () => {
    let value = 0
    let shift = 0
    while (offset < bytes.length) {
      const byte = bytes[offset++]
      value += (byte & 127) * 2 ** shift
      if (byte < 128) return value
      shift += 7
    }
    throw new Error("Truncated protobuf varint")
  }
  const result: Array<Uint8Array> = []
  while (offset < bytes.length) {
    const tag = varint()
    switch (tag & 7) {
      case 0:
        varint()
        break
      case 1:
        offset += 8
        break
      case 2: {
        const size = varint()
        assert.isAtMost(offset + size, bytes.length)
        if (tag >>> 3 === wanted) result.push(bytes.subarray(offset, offset + size))
        offset += size
        break
      }
      case 5:
        offset += 4
        break
      default:
        throw new Error("Unexpected protobuf wire type")
    }
  }
  assert.strictEqual(offset, bytes.length)
  return result
}

const assertPayload = (bytes: Uint8Array, signal: typeof signals[number], format: "json" | "protobuf") => {
  if (format === "json") {
    const body = JSON.parse(new TextDecoder().decode(bytes))
    switch (signal) {
      case "logs":
        assert.strictEqual(body.resourceLogs[0].scopeLogs[0].logRecords[0].body.stringValue, "compression log")
        break
      case "metrics":
        assert.isTrue(body.resourceMetrics[0].scopeMetrics[0].metrics.some(
          (metric: { name: string }) => metric.name === "compression_counter"
        ))
        break
      case "traces":
        assert.strictEqual(body.resourceSpans[0].scopeSpans[0].spans[0].name, "compression span")
        break
    }
  } else {
    const resource = fields(bytes, 1)[0]
    assert.isDefined(resource)
    const scope = fields(resource, 2)[0]
    assert.isDefined(scope)
    const records = fields(scope, 2)
    const values = records.map((record) => {
      const value = fields(record, signal === "metrics" ? 1 : 5)[0]
      return new TextDecoder().decode(signal === "logs" ? fields(value, 1)[0] : value)
    })
    assert.include(
      values,
      signal === "logs" ? "compression log" : signal === "metrics" ? "compression_counter" : "compression span"
    )
  }
}

const emitAndFlush = Effect.gen(function*() {
  yield* Effect.log("compression log")
  yield* Metric.update(Metric.counter("compression_counter"), 1)
  yield* Effect.void.pipe(Effect.withSpan("compression span"))
  yield* (yield* OtlpExporter.Flusher).flush
})

const configuredLayer = (env: Record<string, string>) =>
  Otlp.layerFromConfig({
    loggerMergeWithExisting: false,
    resource: { serviceName: largeServiceName }
  }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnv({
      env: {
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        OTEL_LOGS_EXPORTER: "otlp",
        OTEL_METRICS_EXPORTER: "otlp",
        OTEL_TRACES_EXPORTER: "otlp",
        OTEL_BLRP_SCHEDULE_DELAY: "3600000",
        OTEL_BSP_SCHEDULE_DELAY: "3600000",
        OTEL_METRIC_EXPORT_INTERVAL: "3600000",
        ...env
      }
    })))
  )

const checkRequests = (
  requests: ReadonlyArray<HttpClientRequest.HttpClientRequest>,
  format: "json" | "protobuf",
  compressed: ReadonlyArray<string>
) =>
  Effect.gen(function*() {
    assert.strictEqual(requests.length, 3)
    for (const signal of signals) {
      const request = requests.find((request) => request.url.endsWith("/v1/" + signal))!
      assert.isDefined(request)
      assert.strictEqual(
        request.headers["content-type"],
        format === "json" ? "application/json" : "application/x-protobuf"
      )
      assert.strictEqual(request.headers["content-encoding"], compressed.includes(signal) ? "gzip" : undefined)
      assertPayload(yield* uncompressed(request), signal, format)
    }
  })

describe("OTLP compression", { concurrent: false }, () => {
  for (const format of ["json", "protobuf"] as const) {
    for (const compression of [undefined, "none", "gzip"] as const) {
      it.effect(
        format + " aggregate layer exports all three signals with " + (compression ?? "default") + " compression",
        () => {
          const { httpClient, requests } = capture()
          const layer = (format === "json" ? Otlp.layerJson : Otlp.layerProtobuf)({
            baseUrl: "http://localhost:4318",
            resource: { serviceName: largeServiceName },
            compression,
            loggerMergeWithExisting: false,
            loggerExportInterval: "1 hour",
            metricsExportInterval: "1 hour",
            tracerExportInterval: "1 hour"
          }).pipe(Layer.provideMerge(OtlpExporter.layerFlusher))
          return Effect.gen(function*() {
            yield* emitAndFlush
            yield* checkRequests(requests, format, compression === "gzip" ? signals : [])
          }).pipe(Effect.provide(layer), Effect.provideService(HttpClient.HttpClient, httpClient))
        }
      )
    }
    it.effect(format + " leaves sub-1KB batches uncompressed even with gzip enabled", () => {
      const { httpClient, requests } = capture()
      const layer = (format === "json" ? Otlp.layerJson : Otlp.layerProtobuf)({
        baseUrl: "http://localhost:4318",
        resource: { serviceName: "small" },
        compression: "gzip",
        loggerMergeWithExisting: false,
        loggerExportInterval: "1 hour",
        metricsExportInterval: "1 hour",
        tracerExportInterval: "1 hour"
      }).pipe(Layer.provideMerge(OtlpExporter.layerFlusher))
      return Effect.gen(function*() {
        yield* emitAndFlush
        yield* checkRequests(requests, format, [])
        for (const request of requests) assert.isBelow(bytesOf(request).length, 1024)
      }).pipe(Effect.provide(layer), Effect.provideService(HttpClient.HttpClient, httpClient))
    })
  }

  for (const global of ["gzip", "none"] as const) {
    for (const override of [undefined, ...signals]) {
      it.effect("config global " + global + " with " + (override ?? "no") + " signal override", () => {
        const { httpClient, requests } = capture()
        const env: Record<string, string> = { OTEL_EXPORTER_OTLP_COMPRESSION: global }
        if (override) {
          env["OTEL_EXPORTER_OTLP_" + override.toUpperCase() + "_COMPRESSION"] = global === "gzip"
            ? "none"
            : "gzip"
        }
        return Effect.gen(function*() {
          yield* emitAndFlush
          yield* checkRequests(
            requests,
            "json",
            signals.filter((signal) => (signal === override) !== (global === "gzip"))
          )
        }).pipe(
          Effect.provide(configuredLayer(env).pipe(Layer.provideMerge(OtlpExporter.layerFlusher))),
          Effect.provideService(HttpClient.HttpClient, httpClient)
        )
      })
    }
  }

  for (
    const key of [
      "OTEL_EXPORTER_OTLP_COMPRESSION",
      ...signals.map((signal) => "OTEL_EXPORTER_OTLP_" + signal.toUpperCase() + "_COMPRESSION")
    ]
  ) {
    it.effect("rejects invalid " + key, () => {
      const { httpClient } = capture()
      return Effect.gen(function*() {
        const exit = yield* Effect.exit(Effect.void.pipe(
          Effect.provide(configuredLayer({ [key]: "brotli" })),
          Effect.provideService(HttpClient.HttpClient, httpClient)
        ))
        assert(Exit.isFailure(exit))
        assert.include(Cause.pretty(exit.cause), key)
      })
    })
  }

  it.effect("retries reuse the identical compressed request body", () =>
    Effect.gen(function*() {
      const firstAttempt = yield* Deferred.make<void>()
      const { httpClient, requests } = capture((attempt) => {
        if (attempt === 1) Deferred.doneUnsafe(firstAttempt, Exit.void)
        return new Response(null, { status: attempt === 1 ? 429 : 200, headers: { "retry-after": "1" } })
      })
      yield* Effect.gen(function*() {
        let serialized = 0
        let succeeded = 0
        const exporter = yield* OtlpExporter.make({
          label: "CompressionTest",
          url: "http://localhost:4318/v1/logs",
          headers: undefined,
          compression: "gzip",
          exportInterval: "1 hour",
          maxBatchSize: 100,
          shutdownTimeout: "1 second",
          body: () => {
            serialized++
            return [
              HttpBody.text(largeServiceName, "application/json"),
              Effect.sync(() => {
                succeeded++
              })
            ]
          }
        })
        exporter.push(1)
        const fiber = yield* Effect.forkChild((yield* OtlpExporter.Flusher).flush)
        yield* Deferred.await(firstAttempt)
        yield* TestClock.adjust("1 second")
        yield* Fiber.join(fiber)
        assert.strictEqual(requests.length, 2)
        assert.strictEqual(requests[0].headers["content-encoding"], "gzip")
        assert.strictEqual(requests[0].body, requests[1].body)
        assert.strictEqual(new TextDecoder().decode(yield* uncompressed(requests[1])), largeServiceName)
        assert.strictEqual(serialized, 1)
        assert.strictEqual(succeeded, 1)
      }).pipe(
        Effect.scoped,
        Effect.provide(OtlpExporter.layerFlusher),
        Effect.provideService(HttpClient.HttpClient, httpClient)
      )
    }))

  it.effect("missing CompressionStream disables export without failing flush or shutdown", () => {
    const { httpClient, requests } = capture()
    return Effect.gen(function*() {
      vi.stubGlobal("CompressionStream", undefined)
      yield* Effect.gen(function*() {
        const exporter = yield* OtlpExporter.make({
          label: "CompressionTest",
          url: "http://localhost:4318/v1/logs",
          headers: undefined,
          compression: "gzip",
          exportInterval: "1 hour",
          maxBatchSize: 100,
          shutdownTimeout: "1 second",
          body: () => [HttpBody.text(largeServiceName), Effect.void]
        })
        exporter.push(1)
        yield* (yield* OtlpExporter.Flusher).flush
        exporter.push(2)
        yield* (yield* OtlpExporter.Flusher).flush
      }).pipe(
        Effect.scoped,
        Effect.provide(OtlpExporter.layerFlusher),
        Effect.provideService(HttpClient.HttpClient, httpClient)
      )
      assert.deepStrictEqual(requests, [])
    }).pipe(Effect.ensuring(Effect.sync(() => vi.unstubAllGlobals())))
  })
})
