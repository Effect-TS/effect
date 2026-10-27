import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerError, DockerSystem } from "effect/docker"
import { HttpClientRequest } from "effect/http"
import { inspect } from "node:util"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerEngine", () => {
  it.effect("negotiates within the supported API range", () =>
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
      const error = yield* Effect.flip(makeStubEngine(withPing("1.43")).engine.apiVersion)
      assert.deepStrictEqual(
        error.reason,
        new DockerError.UnsupportedApiVersion({ engineVersion: "1.43", minimum: "1.44" })
      )
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

  it.effect("reports a retryable connection failure without exposing request secrets", () =>
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
      // a declared status's body is capped at 1 MiB too
      const oversized = yield* classify(500, JSON.stringify({ message: "x".repeat(2 * 1024 * 1024) }))
      assert(oversized.reason._tag === "ServerError")
      assert.isAtMost(oversized.reason.message.length, 1024 * 1024)
    }))
})
