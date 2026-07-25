import { assert, describe, it } from "@effect/vitest"
import { Deferred, type Duration, Effect, Exit, Fiber, Ref, Scope } from "effect"
import { TestClock } from "effect/testing"
import { HttpBody, HttpClient, HttpClientResponse } from "effect/unstable/http"
import type { HttpClientError } from "effect/unstable/http"
import { OtlpExporter } from "effect/unstable/observability"

const makeHttpClient = Effect.fnUntraced(function*(retryAfter: string | undefined) {
  const attempts = yield* Ref.make(0)

  const httpClient = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      const attempt = yield* Ref.updateAndGet(attempts, (attempts) => attempts + 1)
      if (attempt === 1) {
        return HttpClientResponse.fromWeb(
          request,
          retryAfter === undefined
            ? new Response(null, { status: 429 })
            : new Response(null, { status: 429, headers: { "retry-after": retryAfter } })
        )
      }
      return HttpClientResponse.fromWeb(request, new Response())
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )

  return { attempts, httpClient } as const
})

const makeExporter = (
  httpClient: HttpClient.HttpClient,
  options?: {
    readonly exportInterval?: Duration.Input
    readonly maxBatchSize?: number | "disabled"
    readonly shutdownTimeout?: Duration.Input
    readonly body?: (data: Array<any>) => HttpBody.HttpBody
  }
) =>
  OtlpExporter.make({
    label: "OtlpExporterTest",
    url: "http://localhost:4318/v1/logs",
    headers: undefined,
    exportInterval: options?.exportInterval ?? "1 hour",
    maxBatchSize: options?.maxBatchSize ?? 1,
    body: options?.body ?? (() => HttpBody.empty),
    shutdownTimeout: options?.shutdownTimeout ?? "1 second"
  }).pipe(Effect.provideService(HttpClient.HttpClient, httpClient))

const yieldNowN = (times: number) =>
  Effect.forEach(Array.from({ length: times }), () => Effect.yieldNow, { discard: true })

const makeControlledHttpClient = Effect.fnUntraced(function*(requestCount: number) {
  const started = yield* Effect.forEach(Array.from({ length: requestCount }), () => Deferred.make<void>())
  const releases = yield* Effect.forEach(Array.from({ length: requestCount }), () => Deferred.make<void>())
  const interrupted = yield* Ref.make(0)
  let requestIndex = 0

  const httpClient = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      const index = requestIndex++
      yield* Deferred.succeed(started[index], undefined)
      yield* Deferred.await(releases[index]).pipe(
        Effect.onInterrupt(() => Ref.update(interrupted, (count) => count + 1))
      )
      return HttpClientResponse.fromWeb(request, new Response())
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )

  return { httpClient, interrupted, releases, started } as const
})

describe("OtlpExporter", () => {
  it.effect("allows an in-flight timer export to finish during shutdown", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { httpClient, releases, started } = yield* makeControlledHttpClient(1)
      const exporter = yield* makeExporter(httpClient, {
        exportInterval: "1 second",
        maxBatchSize: 10
      }).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      yield* TestClock.adjust("1 second")
      yield* Deferred.await(started[0])

      const closeFiber = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* Effect.yieldNow
      assert.isUndefined(closeFiber.pollUnsafe())

      yield* Deferred.succeed(releases[0], undefined)
      yield* Fiber.join(closeFiber)
    }))

  it.effect("waits for each periodic export before starting the next interval", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { httpClient, releases, started } = yield* makeControlledHttpClient(3)
      const exporter = yield* makeExporter(httpClient, {
        exportInterval: "1 second",
        maxBatchSize: "disabled"
      }).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      yield* TestClock.adjust("1 second")
      yield* Deferred.await(started[0])

      yield* TestClock.adjust("1 second")
      assert.isFalse(yield* Deferred.isDone(started[1]))

      yield* Deferred.succeed(releases[0], undefined)
      yield* TestClock.adjust("1 second")
      yield* Deferred.await(started[1])

      const closeFiber = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* Deferred.await(started[2])
      yield* Deferred.succeed(releases[1], undefined)
      yield* Deferred.succeed(releases[2], undefined)
      yield* Fiber.join(closeFiber)
    }))

  it.effect("allows an in-flight batch export to finish during shutdown", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { httpClient, releases, started } = yield* makeControlledHttpClient(1)
      const exporter = yield* makeExporter(httpClient).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      yield* Deferred.await(started[0])

      const closeFiber = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* Effect.yieldNow
      assert.isUndefined(closeFiber.pollUnsafe())

      yield* Deferred.succeed(releases[0], undefined)
      yield* Fiber.join(closeFiber)
    }))

  it.effect("exports remaining telemetry concurrently and waits for all requests", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { httpClient, releases, started } = yield* makeControlledHttpClient(2)
      const batches: Array<Array<number>> = []
      const exporter = yield* makeExporter(httpClient, {
        maxBatchSize: 2,
        body(data) {
          batches.push(data.map((item) => item.value))
          return HttpBody.empty
        }
      }).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      exporter.push({ value: 2 })
      yield* Deferred.await(started[0])
      exporter.push({ value: 3 })

      const closeFiber = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* Deferred.await(started[1])
      assert.deepStrictEqual(batches, [[1, 2], [3]])

      yield* Deferred.succeed(releases[0], undefined)
      yield* Effect.yieldNow
      assert.isUndefined(closeFiber.pollUnsafe())
      yield* Deferred.succeed(releases[1], undefined)
      yield* Fiber.join(closeFiber)
    }))

  it.effect("bounds shutdown waiting and interrupts remaining requests", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { httpClient, interrupted, started } = yield* makeControlledHttpClient(1)
      const exporter = yield* makeExporter(httpClient).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      yield* Deferred.await(started[0])

      const closeFiber = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* TestClock.adjust("1 second")
      yield* Fiber.join(closeFiber)
      assert.strictEqual(yield* Ref.get(interrupted), 1)
    }))

  it.effect("does not initiate or wait for delivery when disabled", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const blocked = yield* Deferred.make<void>()
      const blockedInterrupted = yield* Deferred.make<void>()
      const failed = yield* Deferred.make<void>()
      const attempts = yield* Ref.make(0)
      const httpClient = HttpClient.makeWith(
        Effect.fnUntraced(function*(requestEffect) {
          const request = yield* requestEffect
          const attempt = yield* Ref.updateAndGet(attempts, (count) => count + 1)
          if (attempt === 1) {
            yield* Deferred.succeed(blocked, undefined)
            return yield* Effect.never.pipe(
              Effect.onInterrupt(() => Deferred.succeed(blockedInterrupted, undefined))
            )
          }
          yield* Deferred.succeed(failed, undefined)
          return HttpClientResponse.fromWeb(request, new Response(null, { status: 400 }))
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
      const exporter = yield* makeExporter(httpClient).pipe(Scope.provide(scope))

      exporter.push({ value: 1 })
      yield* Deferred.await(blocked)
      exporter.push({ value: 2 })
      yield* Deferred.await(failed)
      yield* yieldNowN(3)
      exporter.push({ value: 3 })

      yield* Scope.close(scope, Exit.void)
      yield* Deferred.await(blockedInterrupted)
      assert.strictEqual(yield* Ref.get(attempts), 2)
    }))

  it.effect("retries status 429 with numeric retry-after delay", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const { attempts, httpClient } = yield* makeHttpClient("2")
        const exporter = yield* makeExporter(httpClient)

        exporter.push({ value: 1 })
        yield* yieldNowN(3)

        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("1 second")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("1 second")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 2)
      })
    ))

  it.effect("uses fallback retry-after delay when header is non-numeric", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const { attempts, httpClient } = yield* makeHttpClient("soon")
        const exporter = yield* makeExporter(httpClient)

        exporter.push({ value: 1 })
        yield* yieldNowN(3)

        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("4 seconds")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("1 second")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 2)
      })
    ))

  it.effect("uses fallback retry-after delay when header is missing", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const { attempts, httpClient } = yield* makeHttpClient(undefined)
        const exporter = yield* makeExporter(httpClient)

        exporter.push({ value: 1 })
        yield* yieldNowN(3)

        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("4 seconds")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 1)

        yield* TestClock.adjust("1 second")
        yield* yieldNowN(2)
        assert.strictEqual(yield* Ref.get(attempts), 2)
      })
    ))
})
