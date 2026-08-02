import { assert, it } from "@effect/vitest"
import { Effect, Ref } from "effect"
import { TestClock } from "effect/testing"
import { HttpBody, HttpClient, HttpClientResponse } from "effect/unstable/http"
import { OtlpExporter } from "effect/unstable/observability"

it.effect("honors an HTTP-date Retry-After value", () =>
  Effect.scoped(Effect.gen(function*() {
    const attempts = yield* Ref.make(0)
    const client = HttpClient.make((request) =>
      Ref.updateAndGet(attempts, (attempt) => attempt + 1).pipe(
        Effect.map((attempt) =>
          HttpClientResponse.fromWeb(
            request,
            attempt === 1
              ? new Response(null, {
                status: 429,
                headers: { "retry-after": "Thu, 01 Jan 1970 00:01:00 GMT" }
              })
              : new Response()
          )
        )
      )
    )
    const exporter = yield* OtlpExporter.make({
      url: "http://localhost/v1/logs",
      headers: undefined,
      label: "repro",
      exportInterval: "1 hour",
      maxBatchSize: 1,
      body: () => HttpBody.empty,
      shutdownTimeout: "1 second"
    }).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
      Effect.provide(OtlpExporter.layerFlusher)
    )

    exporter.push(1)
    yield* Effect.forEach(Array.from({ length: 3 }), () => Effect.yieldNow, { discard: true })
    assert.strictEqual(yield* Ref.get(attempts), 1)

    yield* TestClock.adjust("5 seconds")
    yield* Effect.forEach(Array.from({ length: 3 }), () => Effect.yieldNow, { discard: true })
    assert.strictEqual(yield* Ref.get(attempts), 1)

    yield* TestClock.adjust("55 seconds")
    yield* Effect.forEach(Array.from({ length: 3 }), () => Effect.yieldNow, { discard: true })
    assert.strictEqual(yield* Ref.get(attempts), 2)
  })))
