import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerSecrets } from "effect/docker"
import { inspect } from "node:util"
import { json, makeStubEngine, recordSpans, withPing } from "./utils/stub.ts"

const Secrets = DockerSecrets.DockerSecrets

// padded standard base64 `+/8=`, base64url `-_8`
const bytes = Uint8Array.of(0xfb, 0xff)

describe("DockerSecrets", () => {
  it.effect("sends Data as padded standard base64, and keeps it out of spans", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/create")
          ? json({ ID: "s1" }, 201)
          : request.method === "GET"
          ? json({ ID: "s1", Version: { Index: 4 }, Spec: { Name: "db", Labels: {} } })
          : request.method === "DELETE"
          ? { status: 204 }
          : {}))
      const { attributes, tracer } = recordSpans()
      const [created, secret] = yield* Secrets.use((secrets) =>
        Effect.all([
          secrets.create({ Name: "db", Data: Redacted.make(bytes) }),
          secrets.inspect("db"),
          secrets.update("db", { Name: "db", Labels: { rev: "2" } }, { version: 4 }),
          secrets.remove("db")
        ])
      ).pipe(stub.provide, Effect.withTracer(tracer))
      assert.deepStrictEqual([created, secret], [{ ID: "s1" }, {
        ID: "s1",
        Version: { Index: 4 },
        Spec: { Name: "db", Labels: {} }
      }])
      const requests = stub.requests.slice(1)
      assert.deepStrictEqual(
        requests.map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          "POST /v1.44/secrets/create",
          "GET /v1.44/secrets/db",
          "POST /v1.44/secrets/db/update?version=4",
          "DELETE /v1.44/secrets/db"
        ]
      )
      assert.deepStrictEqual(JSON.parse(requests[0].body!), { Name: "db", Data: "+/8=" })
      assert.notInclude(attributes().join("\n"), "+/8=")
      assert.notInclude(inspect(requests.map((request) => request.headers)), "+/8=")
    }))

  it.effect("fails with SwarmUnavailable on a node that isn't a manager", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ message: "This node is not a swarm manager." }, 503)))
      const error = yield* Effect.flip(Secrets.use((secrets) => secrets.list())).pipe(stub.provide)
      assert.strictEqual(error.reason._tag, "SwarmUnavailable")
    }))
})
