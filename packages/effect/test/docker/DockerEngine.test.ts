import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerError, DockerSystem } from "effect/docker"
import { HttpClientRequest } from "effect/http"
import { inspect } from "node:util"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerEngine", () => {
  it.effect("negotiates the Engine's API version, capped at the pinned spec's, and doesn't cache a failure", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<[string | undefined, string]> = [
        ["1.50", "1.50"],
        // compared numerically
        ["1.100", "1.56"],
        // no Api-Version header: the minimum
        [undefined, "1.44"]
      ]
      for (const [engineVersion, expected] of cases) {
        const stub = makeStubEngine(engineVersion === undefined ? () => ({ body: "OK" }) : withPing(engineVersion))
        assert.strictEqual(yield* stub.engine.apiVersion, expected, engineVersion)
      }
      for (const engineVersion of ["1.43", "1.9"]) {
        const error = yield* Effect.flip(makeStubEngine(withPing(engineVersion)).engine.apiVersion)
        assert.deepStrictEqual(error.reason, new DockerError.UnsupportedApiVersion({ engineVersion, minimum: "1.44" }))
      }
      let fail = true
      const stub = makeStubEngine((request) => fail ? { status: 503, body: "starting" } : withPing("1.44")(request))
      const error = yield* Effect.flip(stub.engine.apiVersion)
      // `HEAD` first, then `GET`, which names the failure
      assert.deepStrictEqual(
        [error.reason, error.operation, stub.requests.map((request) => `${request.method} ${request.url.pathname}`)],
        [new DockerError.Unavailable({ message: "starting" }), "docker.Engine.ping", ["HEAD /_ping", "GET /_ping"]]
      )
      fail = false
      assert.strictEqual(yield* stub.engine.apiVersion, "1.44")
    }))

  it.effect("prefixes requests with the negotiated version after one unversioned ping, or the pinned one", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.50", () => json({})))
      yield* DockerSystem.DockerSystem.use((system) => Effect.andThen(system.info, system.info)).pipe(stub.provide)
      assert.deepStrictEqual(stub.requests.map((request) => `${request.method} ${request.url.pathname}`), [
        "HEAD /_ping",
        "GET /v1.50/info",
        "GET /v1.50/info"
      ])
      // a pinned version is used as-is, without negotiating
      const pinned = makeStubEngine(withPing("1.50", () => json({})), { apiVersion: "1.60" })
      yield* DockerSystem.DockerSystem.use((system) => system.info).pipe(pinned.provide)
      assert.deepStrictEqual(pinned.requests.map((request) => request.url.pathname), ["/v1.60/info"])
    }))

  it.effect("sends the configured headers, unless the request sets them", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({})), {
        config: { httpHeaders: { "X-Meta": "configured", "X-Other": "configured" } }
      })
      yield* stub.engine.client.execute(
        HttpClientRequest.get("/info").pipe(HttpClientRequest.setHeader("x-other", "own"))
      )
      const info = stub.requests.find((request) => request.url.pathname === "/v1.44/info")!
      assert.strictEqual(info.headers["x-meta"], "configured")
      assert.strictEqual(info.headers["x-other"], "own")
    }))

  it.effect("fails with a sanitized ConnectionFailed, retryable unless it names a misconfiguration", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(
        () => ({ fail: true, cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) }),
        {
          apiVersion: "1.44",
          config: {
            endpoint: {
              _tag: "Tcp",
              host: "docker.example.com",
              port: 2376,
              tls: { verify: true, clientCertificate: { cert: "CERT", key: Redacted.make("secret-tls-key") } }
            }
          }
        }
      )
      const error = yield* stub.engine.client.execute(
        HttpClientRequest.post("/build").pipe(
          HttpClientRequest.setUrlParam("buildargs", "secret-query-value"),
          HttpClientRequest.setHeader("x-registry-auth", "secret-header-value"),
          HttpClientRequest.bodyText("secret-body-value")
        )
      ).pipe(Effect.flip)
      assert(error.reason._tag === "ConnectionFailed")
      assert.isTrue(error.isRetryable)
      assert.strictEqual(error.reason.target, "tcp://docker.example.com:2376")
      assert.strictEqual(
        error.message,
        "Failed to connect to the Engine at tcp://docker.example.com:2376: connect ECONNREFUSED " +
          "(connection refused: is the Engine running and listening there?)"
      )
      for (const text of [JSON.stringify(error), inspect(error, { depth: 30 }), String(error)]) {
        for (const secret of ["secret-tls-key", "secret-query-value", "secret-header-value", "secret-body-value"]) {
          assert.notInclude(text, secret)
        }
      }
      // a failure that names a misconfiguration isn't retried
      const permanent: ReadonlyArray<[string, string]> = [
        ["SELF_SIGNED_CERT_IN_CHAIN", "the Engine's TLS certificate couldn't be verified"],
        ["ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED", "the Engine requires a client certificate"],
        ["ERR_SSL_WRONG_VERSION_NUMBER", "TLS/plain mismatch: the Engine and the client disagree about TLS"],
        ["EACCES", "permission denied on /test.sock: is the user allowed to use the Engine?"]
      ]
      for (const [code, hint] of permanent) {
        const cause = Object.assign(new Error(code), { code })
        const stub = makeStubEngine(() => ({ fail: true, cause }))
        const failed = yield* Effect.flip(stub.engine.apiVersion)
        assert(failed.reason._tag === "ConnectionFailed")
        assert.strictEqual(failed.reason.hint, hint, code)
        assert.isFalse(failed.isRetryable, code)
        // as in moby's client, a connection failure doesn't dial again with `GET`
        assert.strictEqual(stub.requests.length, 1, code)
      }
    }))
})

describe("DockerError", () => {
  const classify = (status: number, body: string) =>
    DockerSystem.DockerSystem.use((system) => system.info).pipe(
      makeStubEngine(withPing("1.44", () => ({ status, body }))).provide,
      Effect.flip
    )

  it.effect("maps statuses with moby's table", () =>
    Effect.gen(function*() {
      const table: Array<[number, DockerError.DockerErrorReason["_tag"]]> = [
        [400, "BadRequest"],
        [401, "Unauthorized"],
        [403, "Forbidden"],
        [404, "NotFound"],
        [409, "Conflict"],
        [412, "PreconditionFailed"],
        [429, "TooManyRequests"],
        [500, "ServerError"],
        [501, "NotImplemented"],
        [503, "Unavailable"],
        [418, "UnexpectedStatus"],
        [502, "UnexpectedStatus"]
      ]
      for (const [status, tag] of table) {
        const error = yield* classify(status, JSON.stringify({ message: "boom" }))
        assert.strictEqual(error.reason._tag, tag)
        assert.strictEqual(error.isRetryable, tag === "TooManyRequests" || tag === "Unavailable")
      }
    }))

  it.effect("reads the Engine's error body, or keeps a body that isn't JSON as text", () =>
    Effect.gen(function*() {
      const docker = yield* classify(409, JSON.stringify({ message: "conflict" }))
      assert.deepStrictEqual(
        [docker.reason, docker.operation],
        [new DockerError.Conflict({ message: "conflict" }), "docker.System.info"]
      )
      const text = yield* classify(404, "Not Found\n")
      assert(text.reason._tag === "NotFound")
      assert.strictEqual(text.reason.message, "Not Found")
    }))

  it.effect("maps decode failures to InvalidResponse, naming the operation", () =>
    Effect.gen(function*() {
      const cases = [json({ Version: 1 }), { headers: { "content-type": "application/json" }, body: "not json" }]
      for (const reply of cases) {
        const error = yield* DockerSystem.DockerSystem.use((system) => system.version).pipe(
          makeStubEngine(withPing("1.44", () => reply)).provide,
          Effect.flip
        )
        assert(error.reason._tag === "InvalidResponse")
        assert.strictEqual(error.operation, "docker.System.version")
      }
    }))
})
