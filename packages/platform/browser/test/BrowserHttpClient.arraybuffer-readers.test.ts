import * as BrowserHttpClient from "@effect/platform-browser/BrowserHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as MXHR from "mock-xmlhttprequest"

const body = "{\"message\":\"caf\u00e9 \ud83c\udf0d\"}"

const completedResponse = (mode: BrowserHttpClient.XHRResponseType, body: string | ArrayBuffer) =>
  Effect.gen(function*() {
    const xhr = new MXHR.MockXhr()
    const completed = yield* Deferred.make<void>()
    xhr.onSend = (request) => {
      request.respond(200, { "content-type": "application/json; charset=utf-8" }, body)
      Deferred.doneUnsafe(completed, Effect.void)
    }
    const response = yield* HttpClient.get("https://example.test/response").pipe(
      Effect.provide(BrowserHttpClient.layerXMLHttpRequest),
      Effect.provideService(BrowserHttpClient.XMLHttpRequest, () => xhr),
      Effect.provideService(BrowserHttpClient.CurrentXHRResponseType, mode)
    )
    yield* Deferred.await(completed)
    assert.strictEqual(xhr.readyState, xhr.DONE)
    assert.strictEqual(response.status, 200)
    return { response, xhr }
  })

describe("BrowserHttpClient completed arraybuffer readers", () => {
  it.effect("mock enforces XHR responseText restriction and preserves actual bytes", () =>
    Effect.gen(function*() {
      const bytes = new TextEncoder().encode(body).buffer
      const { xhr } = yield* completedResponse("arraybuffer", bytes)
      assert.strictEqual(xhr.response, bytes)
      const error: unknown = assert.throws(() => xhr.responseText)
      assert.instanceOf(error, Error)
      assert.strictEqual(error.name, "InvalidStateError")
    }))

  for (const mode of ["arraybuffer", "text"] as const) {
    for (const reader of ["text", "json", "stream"] as const) {
      it.effect(`${reader} reads completed UTF-8 in ${mode} mode`, () =>
        Effect.gen(function*() {
          const { response } = yield* completedResponse(
            mode,
            mode === "arraybuffer" ? new TextEncoder().encode(body).buffer : body
          )
          if (reader === "json") {
            assert.deepStrictEqual(yield* response.json, { message: "caf\u00e9 \ud83c\udf0d" })
          } else {
            const text = yield* reader === "stream"
              ? response.stream.pipe(Stream.decodeText(), Stream.mkString)
              : response.text
            assert.strictEqual(text, body)
          }
        }))
    }
  }

  it.effect("arrayBuffer preserves arbitrary binary bytes in arraybuffer mode", () =>
    Effect.gen(function*() {
      const bytes = new Uint8Array([0, 255, 128, 65, 195, 169])
      const { response } = yield* completedResponse("arraybuffer", bytes.buffer)
      const result = yield* response.arrayBuffer
      assert.instanceOf(result, ArrayBuffer)
      assert.deepStrictEqual(new Uint8Array(result), bytes)
    }))

  it.effect("arrayBuffer preserves valid UTF-8 in text mode", () =>
    Effect.gen(function*() {
      const { response } = yield* completedResponse("text", body)
      const result = yield* response.arrayBuffer
      assert.instanceOf(result, ArrayBuffer)
      assert.deepStrictEqual(new Uint8Array(result), new TextEncoder().encode(body))
    }))
})

describe("BrowserHttpClient arraybuffer reader controls", () => {
  for (const mode of ["arraybuffer", "text"] as const) {
    for (const reader of ["text", "json", "stream"] as const) {
      it.effect(`${reader} waits for the complete body in ${mode} mode`, () =>
        Effect.gen(function*() {
          const xhr = new MXHR.MockXhr()
          const sent = yield* Deferred.make<NonNullable<MXHR.MockXhr["currentRequest"]>>()
          xhr.onSend = (request) => {
            Deferred.doneUnsafe(sent, Effect.succeed(request))
          }
          const responseFiber = yield* HttpClient.get("https://example.test/response").pipe(
            Effect.provide(BrowserHttpClient.layerXMLHttpRequest),
            Effect.provideService(BrowserHttpClient.XMLHttpRequest, () => xhr),
            Effect.provideService(BrowserHttpClient.CurrentXHRResponseType, mode),
            Effect.forkChild
          )
          const request = yield* Deferred.await(sent)
          request.setResponseHeaders(200, { "content-type": "application/json; charset=utf-8" })
          const response = yield* Fiber.join(responseFiber)
          let completed = false
          const read = reader === "stream"
            ? response.stream.pipe(Stream.decodeText(), Stream.mkString)
            : reader === "json"
            ? Effect.map(response.json, (value) => JSON.stringify(value))
            : response.text
          const bodyFiber = yield* read.pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                completed = true
              })
            ),
            Effect.forkChild({ startImmediately: true })
          )
          // The mock exposes LOADING but cannot supply partial response text.
          request.downloadProgress(1, new TextEncoder().encode(body).byteLength)
          assert.strictEqual(xhr.readyState, xhr.LOADING)
          assert.strictEqual(completed, false)
          request.setResponseBody(mode === "arraybuffer" ? new TextEncoder().encode(body).buffer : body)
          assert.strictEqual(yield* Fiber.join(bodyFiber), body)
        }))
    }
  }

  it.effect("stream preserves arbitrary binary bytes in arraybuffer mode", () =>
    Effect.gen(function*() {
      const bytes = new Uint8Array([0, 255, 128, 65, 195, 169])
      const { response } = yield* completedResponse("arraybuffer", bytes.buffer)
      const chunks = yield* Stream.runCollect(response.stream)
      assert.deepStrictEqual(chunks.flatMap((chunk) => Array.from(chunk)), Array.from(bytes))
      assert.strictEqual(yield* response.arrayBuffer, bytes.buffer)
    }))

  it.effect("empty arraybuffer bodies support cached text, JSON, and stream reads", () =>
    Effect.gen(function*() {
      const { response } = yield* completedResponse("arraybuffer", new ArrayBuffer(0))
      const text = response.text
      assert.strictEqual(yield* text, "")
      assert.strictEqual(yield* response.text, "")
      assert.strictEqual(yield* response.json, null)
      assert.strictEqual(yield* response.stream.pipe(Stream.decodeText(), Stream.mkString), "")
    }))
})
