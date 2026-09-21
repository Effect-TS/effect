import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { listStaged, viewStaged } from "../src/Registry.ts"

const clientLayer = (status: number, body: unknown) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.makeWith(
      Effect.fnUntraced(function*(requestEffect) {
        const request = yield* requestEffect
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" }
          })
        )
      }),
      Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
    )
  )

describe("stage registry failures", () => {
  for (const status of [401, 500]) {
    it.effect("returns the raw " + status + " list response for the command to record", () =>
      Effect.gen(function*() {
        const result = yield* listStaged(Option.none(), Option.none())
        assert.strictEqual(result.responses[0]?.status, status)
        assert.deepStrictEqual(result.responses[0]?.body, { error: "status-" + status })
      }).pipe(Effect.provide(clientLayer(status, { error: "status-" + status }))))

    it.effect("returns the raw " + status + " view response for the command to record", () =>
      Effect.gen(function*() {
        const result = yield* viewStaged(Option.none(), "stage-id")
        assert.strictEqual(result.response.status, status)
        assert.deepStrictEqual(result.response.body, { error: "status-" + status })
      }).pipe(Effect.provide(clientLayer(status, { error: "status-" + status }))))
  }
})
