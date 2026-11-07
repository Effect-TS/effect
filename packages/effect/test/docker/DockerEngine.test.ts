import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { type DockerError, DockerSystem } from "effect/docker"
import { HttpClientRequest } from "effect/http"
import { inspect } from "node:util"
import { json, makeStubEngine, type Recorded, withPing } from "./utils/stub.ts"

describe("DockerEngine", () => {
  it.effect("sends every request at API 1.52, after checking once that the Engine serves it", () =>
    Effect.gen(function*() {
      // a current Engine serves 1.44 through 1.56; nothing is negotiated down or up
      const stub = makeStubEngine(withPing("1.56", () => json({})))
      yield* DockerSystem.DockerSystem.use((system) => Effect.andThen(system.info, system.info)).pipe(stub.provide)
      const versioned = stub.requests.filter((request) => /^\/v\d/.test(request.url.pathname))
      assert.deepStrictEqual(versioned.map((request) => request.url.pathname), ["/v1.52/info", "/v1.52/info"])
      // the check runs once, before the first versioned request
      const first = stub.requests.indexOf(versioned[0])
      assert.isAbove(first, 0)
      assert.isTrue(stub.requests.slice(first).every((request) => request.url.pathname.startsWith("/v1.52/")))
    }))

  it.effect("fails with UnsupportedApiVersion when the Engine can't serve API 1.52, before any versioned request", () =>
    Effect.gen(function*() {
      // the daemon answers a version outside its range as it does
      const outOfRange = (message: string) => (request: Recorded) =>
        /^\/v\d/.test(request.url.pathname) ? json({ message }, 400) : json({})
      const engines = [
        // Docker Engine 28: API 1.51 at most, so the Engine must be upgraded, not just the CLI
        withPing("1.51", outOfRange("client version 1.52 is too new. Maximum supported API version is 1.51")),
        // a future Engine that dropped 1.52
        withPing(
          "1.60",
          outOfRange("client version 1.52 is too old. Minimum supported API version is 1.53"),
          "1.53"
        )
      ]
      const [old, future] = yield* Effect.forEach(engines, (engine) => {
        const stub = makeStubEngine(engine)
        return DockerSystem.DockerSystem.use((system) => system.info).pipe(
          stub.provide,
          Effect.flip,
          Effect.tap(() =>
            Effect.sync(() => assert.isFalse(stub.requests.some((request) => /^\/v\d/.test(request.url.pathname))))
          )
        )
      })
      for (const error of [old, future]) {
        assert.strictEqual(error.reason._tag, "UnsupportedApiVersion")
        assert.include(error.message, "1.52")
      }
      // the CLI may be current while the daemon isn't
      assert.match(old.message, /upgrade the Docker Engine/i)
    }))

  it.effect("reports a retryable connection failure without exposing request secrets", () =>
    Effect.gen(function*() {
      // the version check succeeds; the request carrying secrets is the one that can't connect
      const stub = makeStubEngine(
        withPing(
          "1.52",
          () => ({ fail: true, cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) })
        ),
        {
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
      makeStubEngine(withPing("1.52", () => ({ status, body }))).provide,
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
