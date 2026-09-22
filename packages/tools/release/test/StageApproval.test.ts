import { StageApproval } from "@effect/release/StageApproval"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { EFFECT_STAGE_ID, otp } from "./utils.ts"

const TOKEN = "approve-token-value"

const respond = (responses: Array<Response>) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const client = HttpClient.make((request) => {
    requests.push(request)
    const response = responses.shift()
    return response === undefined
      ? Effect.die("unexpected request")
      : Effect.succeed(HttpClientResponse.fromWeb(request, response))
  })
  return { requests, client }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } })

const withToken = (token?: string) =>
  ConfigProvider.layer(ConfigProvider.fromEnv({ env: token === undefined ? {} : { NPM_APPROVE_TOKEN: token } }))

const layer = (client: HttpClient.HttpClient, token?: string) =>
  StageApproval.layer.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, client)),
    Layer.provide(withToken(token))
  )

describe("StageApproval layer", () => {
  it.effect("views a staged item with the stage authentication headers", () => {
    const { client, requests } = respond([
      json({ id: EFFECT_STAGE_ID, packageName: "effect", version: "4.0.0-rc.117", tag: "rc", status: "staged" }),
      json({ error: "not found" }, 404)
    ])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      const item = yield* approval.viewStaged(EFFECT_STAGE_ID)
      assert.deepStrictEqual(
        item,
        Option.some({
          id: EFFECT_STAGE_ID,
          packageName: "effect",
          version: "4.0.0-rc.117",
          tag: Option.some("rc"),
          status: Option.some("staged")
        })
      )
      assert.deepStrictEqual(yield* approval.viewStaged(EFFECT_STAGE_ID), Option.none())

      assert.strictEqual(requests[0].method, "GET")
      assert.strictEqual(requests[0].url, `https://registry.npmjs.org/-/stage/${EFFECT_STAGE_ID}`)
      assert.strictEqual(requests[0].headers.authorization, `Bearer ${TOKEN}`)
      assert.strictEqual(requests[0].headers["npm-auth-type"], "web")
      assert.strictEqual(requests[0].headers["npm-command"], "stage")
      assert.isUndefined(requests[0].headers["npm-otp"])
    }).pipe(Effect.provide(layer(client, TOKEN)))
  })

  it.effect("approves with a POST carrying the OTP header", () => {
    const { client, requests } = respond([json({ id: EFFECT_STAGE_ID, status: "published" })])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      yield* approval.approve(EFFECT_STAGE_ID, otp)
      assert.lengthOf(requests, 1)
      assert.strictEqual(requests[0].method, "POST")
      assert.strictEqual(requests[0].url, `https://registry.npmjs.org/-/stage/${EFFECT_STAGE_ID}/approve`)
      assert.strictEqual(requests[0].headers.authorization, `Bearer ${TOKEN}`)
      assert.strictEqual(requests[0].headers["npm-auth-type"], "web")
      assert.strictEqual(requests[0].headers["npm-command"], "stage")
      assert.strictEqual(requests[0].headers["npm-otp"], "123456")
    }).pipe(Effect.provide(layer(client, TOKEN)))
  })

  it.effect("reports the registry's proof-of-presence challenge as an OTP failure without leaking the OTP", () => {
    const { client } = respond([
      json({ authUrl: "https://www.npmjs.com/auth/cli/x", doneUrl: "https://www.npmjs.com/auth/cli/x/done" }, 401),
      json({ error: "OTP required" }, 401, { "www-authenticate": "OTP" })
    ])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      for (let attempt = 0; attempt < 2; attempt++) {
        const error = yield* Effect.flip(approval.approve(EFFECT_STAGE_ID, otp))
        assert.strictEqual(error._tag, "ReleaseError")
        assert.match(error.message, /one-time password|OTP/)
        assert.include(error.message, EFFECT_STAGE_ID)
        assert.notInclude(error.message, "123456")
        assert.notInclude(error.message, TOKEN)
      }
    }).pipe(Effect.provide(layer(client, TOKEN)))
  })

  it.effect("fails with the status and body on any other rejection, never echoing credentials", () => {
    const { client } = respond([json({ error: "forbidden: token cannot approve" }, 403)])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      const error = yield* Effect.flip(approval.approve(EFFECT_STAGE_ID, otp))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "403")
      assert.include(error.message, "token cannot approve")
      assert.notInclude(error.message, "123456")
      assert.notInclude(error.message, TOKEN)
    }).pipe(Effect.provide(layer(client, TOKEN)))
  })

  it.effect("rejects an unexpected status on view", () => {
    const { client } = respond([json({}, 503)])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      const error = yield* Effect.flip(approval.viewStaged(EFFECT_STAGE_ID))
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "503")
    }).pipe(Effect.provide(layer(client, TOKEN)))
  })

  it.effect("fails before any request when the approve token is missing", () => {
    const { client, requests } = respond([])
    return Effect.gen(function*() {
      const approval = yield* StageApproval
      const approveError = yield* Effect.flip(approval.approve(EFFECT_STAGE_ID, otp))
      assert.strictEqual(approveError._tag, "ReleaseError")
      assert.include(approveError.message, "NPM_APPROVE_TOKEN")
      const viewError = yield* Effect.flip(approval.viewStaged(EFFECT_STAGE_ID))
      assert.strictEqual(viewError._tag, "ReleaseError")
      assert.include(viewError.message, "NPM_APPROVE_TOKEN")
      assert.lengthOf(requests, 0)
    }).pipe(Effect.provide(layer(client)))
  })
})
