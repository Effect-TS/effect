import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

class SourceContext extends Context.Service<SourceContext, string>()("test/HttpClient/SourceContext") {}
class RecoveryContext extends Context.Service<RecoveryContext, HttpClientResponse.HttpClientResponse>()(
  "test/HttpClient/RecoveryContext"
) {}
class RecoveryExtraContext
  extends Context.Service<RecoveryExtraContext, string>()("test/HttpClient/RecoveryExtraContext")
{}

const request = HttpClientRequest.get("https://fixture.invalid/catch")
const makeResponse = () => HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
const failure = Effect.fail("synthetic failure")
const failed = HttpClient.makeWith(() => failure, Effect.succeed)

describe("HttpClient.catch valid runtime controls", () => {
  it.effect("returns the actual fallback response in both forms", () =>
    Effect.gen(function*() {
      const response = makeResponse()
      const recover = (error: string) => {
        assert.strictEqual(error, "synthetic failure")
        return Effect.succeed(response)
      }
      assert.strictEqual(yield* HttpClient.catch(failed, recover).execute(request), response)
      assert.strictEqual(yield* failed.pipe(HttpClient.catch(recover)).execute(request), response)
    }))

  it.effect("returns a genuine response subtype in both forms", () =>
    Effect.gen(function*() {
      const response = Object.assign(makeResponse(), { fixture: "response" })
      const recover = (_error: string) => Effect.succeed(response)
      assert.strictEqual(yield* HttpClient.catch(failed, recover).execute(request), response)
      assert.strictEqual(yield* failed.pipe(HttpClient.catch(recover)).execute(request), response)
    }))

  it.effect("does not call recovery for a successful client", () =>
    Effect.gen(function*() {
      const response = makeResponse()
      const successful = HttpClient.makeWith(() => Effect.succeed(response), Effect.succeed)
      let calls = 0
      const recover = (_error: never) => {
        calls++
        return Effect.fail("must not be called")
      }
      assert.strictEqual(yield* HttpClient.catch(successful, recover).execute(request), response)
      assert.strictEqual(yield* successful.pipe(HttpClient.catch(recover)).execute(request), response)
      assert.strictEqual(calls, 0)
    }))

  it.effect("preserves a never-success recovery failure in both forms", () =>
    Effect.gen(function*() {
      const recover = (_error: string) => Effect.fail("recovery failure")
      assert.deepStrictEqual(
        yield* Effect.exit(HttpClient.catch(failed, recover).execute(request)),
        Exit.fail("recovery failure")
      )
      assert.deepStrictEqual(
        yield* Effect.exit(failed.pipe(HttpClient.catch(recover)).execute(request)),
        Exit.fail("recovery failure")
      )
    }))

  it.effect("provides source and both recovery contexts without losing requirements", () =>
    Effect.gen(function*() {
      const response = makeResponse()
      const producer = Effect.flatMap(SourceContext, (value) => Effect.fail(value))
      const contextual = HttpClient.makeWith(() => producer, Effect.succeed)
      const recover = (error: string) =>
        Effect.gen(function*() {
          assert.strictEqual(error, "provided source")
          assert.strictEqual(yield* RecoveryExtraContext, "provided extra")
          return yield* RecoveryContext
        })
      const direct = HttpClient.catch(contextual, recover)
      const saved = HttpClient.catch(recover)
      for (const client of [direct, saved(contextual)]) {
        const actual = yield* client.execute(request).pipe(
          Effect.provideService(SourceContext, "provided source"),
          Effect.provideService(RecoveryContext, response),
          Effect.provideService(RecoveryExtraContext, "provided extra")
        )
        assert.strictEqual(actual, response)
      }
    }))

  it.effect("preserves explicit response and never-success five-generic calls", () =>
    Effect.gen(function*() {
      const response = makeResponse()
      const recovered = HttpClient.catch<string, never, HttpClientResponse.HttpClientResponse, never, never>(
        failed,
        () => Effect.succeed(response)
      )
      const refailed = HttpClient.catch<string, never, never, string, never>(
        failed,
        () => Effect.fail("explicit failure")
      )
      assert.strictEqual(yield* recovered.execute(request), response)
      assert.deepStrictEqual(yield* Effect.exit(refailed.execute(request)), Exit.fail("explicit failure"))
    }))
})
