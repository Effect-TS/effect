import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpEffect,
  HttpServerRequest,
  HttpServerResponse
} from "effect/http"

const payload = "hello"
const bytes = new TextEncoder().encode(payload)
const fromClient = () =>
  HttpServerRequest.fromClientRequest(
    HttpClientRequest.post("http://localhost/upload").pipe(
      HttpClientRequest.setHeader("x-test", "headers-only"),
      HttpClientRequest.bodyStream(Stream.succeed(bytes), { contentType: "text/plain" })
    )
  )

const fromWeb = () =>
  HttpServerRequest.fromWeb(
    new Request("http://localhost/upload", {
      method: "POST",
      headers: { "x-test": "headers-only" },
      body: payload
    })
  )

const assertDefect = (exit: Exit.Exit<unknown, unknown>, message: RegExp) => {
  assert.isTrue(Exit.isFailure(exit), "body read must fail")
  if (Exit.isFailure(exit)) {
    assert.isTrue(Cause.hasDies(exit.cause), "body reuse must be a defect, not a typed parse error")
    assert.match(String(Cause.squash(exit.cause)), message)
  }
}

describe("request body consumption", () => {
  for (const [adapter, makeRequest] of [["web", fromWeb], ["client", fromClient]] as const) {
    describe(adapter, () => {
      it.effect("caches text but rejects a stream after a buffered read", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          assert.strictEqual(yield* request.text, payload)
          assert.strictEqual(yield* request.text, payload)
          assert.strictEqual(yield* request.modify({ url: "/copy" }).text, payload)
          assertDefect(yield* Effect.exit(Stream.runDrain(request.stream)), /middleware|already.*read/i)
        }))

      it.effect("rejects rerunning a stream and reading through modify", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          const stream = request.stream
          assert.deepStrictEqual(yield* Stream.runCollect(stream), [bytes])
          const secondRun = yield* Effect.exit(Stream.runDrain(stream))
          const modifiedRead = yield* Effect.exit(Stream.runDrain(request.modify({ url: "/copy" }).stream))
          assertDefect(secondRun, /second|run.*again|already.*consum/i)
          assertDefect(
            modifiedRead,
            /second|run.*again|already.*consum/i
          )
        }))

      it.effect("toWeb for headers does not claim the body, even when its stream opens eagerly", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          const web = yield* HttpServerRequest.toWeb(request)
          assert.strictEqual(web.headers.get("x-test"), "headers-only")
          yield* Effect.yieldNow
          assert.strictEqual(yield* request.text, payload)
        }))

      it.effect("toWeb succeeds after consumption and rejects only when its body is read", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          yield* request.text
          const web = yield* HttpServerRequest.toWeb(request)
          const error = yield* Effect.promise(() => web.text().then(() => undefined, (error: unknown) => error))
          if (adapter === "web") {
            assert.instanceOf(error, TypeError)
          } else {
            assert.match(String(error), /consum|already.*read|middleware/i)
            const exit = yield* Effect.exit(Stream.runDrain(request.stream))
            assertDefect(exit, /consum|already.*read|middleware/i)
            if (Exit.isFailure(exit)) {
              assert.strictEqual(String(error), String(Cause.squash(exit.cause)))
            }
          }
        }))

      it.effect("fromWebHandler can inspect headers without claiming the body", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          const response = yield* HttpEffect.fromWebHandler(async (web) => {
            assert.strictEqual(web.headers.get("x-test"), "headers-only")
            return new Response(null, { status: 204 })
          }).pipe(
            Effect.provideService(HttpServerRequest.HttpServerRequest, request)
          )
          assert.strictEqual(response.status, 204)
          assert.strictEqual(yield* request.text, payload)
        }))

      it.effect("fromWebHandler reaches the handler after the body was consumed", () =>
        Effect.gen(function*() {
          const request = makeRequest()
          yield* request.text
          const response = yield* HttpEffect.fromWebHandler(async (web) => {
            try {
              await web.text()
              return new Response(null, { status: 400 })
            } catch (error) {
              if (adapter === "web") {
                assert.instanceOf(error, TypeError)
              } else {
                assert.match(String(error), /consum|already.*read|middleware/i)
              }
              return new Response(null, { status: 204 })
            }
          }).pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, request))
          assert.strictEqual(response.status, 204)
        }))
    })
  }

  it.effect("allocates independent consumption state for requests backed by the same client source", () =>
    Effect.gen(function*() {
      const source = HttpClientRequest.post("http://localhost/upload").pipe(
        HttpClientRequest.bodyStream(Stream.succeed(bytes))
      )
      const first = HttpServerRequest.fromClientRequest(source)
      const retry = HttpServerRequest.fromClientRequest(source)
      assert.strictEqual(yield* first.text, payload)
      assert.strictEqual(yield* retry.text, payload)
    }))

  it.effect("treats a web body read outside Effect as consumed", () =>
    Effect.gen(function*() {
      const source = new Request("http://localhost/upload", { method: "POST", body: payload })
      const request = HttpServerRequest.fromWeb(source)
      yield* Effect.promise(() => source.text())
      assertDefect(yield* Effect.exit(Stream.runDrain(request.stream)), /consum|already.*read|middleware/i)
    }))

  for (const streaming of [false, true]) {
    it.effect(`rejects a first body read after a ${streaming ? "streaming" : "non-stream"} response finishes`, () =>
      Effect.gen(function*() {
        let captured: HttpServerRequest.HttpServerRequest | undefined
        const handler = HttpEffect.toWebHandler(Effect.gen(function*() {
          captured = yield* HttpServerRequest.HttpServerRequest
          return streaming
            ? HttpServerResponse.stream(Stream.succeed(bytes))
            : HttpServerResponse.text("done")
        }))
        const response = yield* Effect.promise(() =>
          handler(new Request("http://localhost/upload", { method: "POST", body: payload }))
        )
        yield* Effect.promise(() => response.text())
        assert.isDefined(captured)
        assertDefect(yield* Effect.exit(Stream.runDrain(captured!.stream)), /after.*response|response.*finish/i)
      }))
  }

  it.effect("allows the first body read inside a streaming response", () =>
    Effect.gen(function*() {
      const handler = HttpEffect.toWebHandler(Effect.map(
        HttpServerRequest.HttpServerRequest,
        (request) => HttpServerResponse.stream(request.stream)
      ))
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/upload", { method: "POST", body: payload }))
      )
      assert.strictEqual(yield* Effect.promise(() => response.text()), payload)
    }))

  it.effect("a retried proxied upload cannot replay the incoming body", () =>
    Effect.gen(function*() {
      const request = HttpServerRequest.toClientRequest(fromClient())
      const client = HttpClient.make((outgoing) =>
        Effect.gen(function*() {
          assert.strictEqual(outgoing.body._tag, "Stream")
          if (outgoing.body._tag === "Stream") {
            yield* Stream.runDrain(outgoing.body.stream).pipe(Effect.orDie)
          }
          return HttpClientResponse.fromWeb(outgoing, new Response(null, { status: 503 }))
        })
      ).pipe(HttpClient.filterStatusOk, HttpClient.retry({ times: 1 }))
      assertDefect(yield* Effect.exit(client.execute(request)), /second|run.*again|already.*consum/i)
    }))
})
