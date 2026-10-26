import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerApi, DockerSecrets } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup } from "effect/http-api"
import { inspect } from "node:util"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("secrets").add(DockerApi.Secrets.endpoints.create, DockerApi.Secrets.endpoints.inspect)
    .middleware(DockerApi.SwarmErrors)
)

const secrets = new Map<string, DockerApi.SecretSpec>()

const Handlers = HttpApiBuilder.group(Served, "secrets", (handlers) =>
  handlers
    .handle("create", ({ payload }) =>
      Effect.sync(() => {
        secrets.set("s1", payload)
        return { ID: "s1" }
      }))
    .handle("inspect", ({ params }) => Effect.sync(() => ({ ID: params.id, Spec: secrets.get(params.id)! }))))

describe("DockerSecrets", () => {
  it.effect("round-trips DockerApi: Data as redacted bytes", () =>
    Effect.gen(function*() {
      const service = yield* DockerSecrets.DockerSecrets
      // padded standard base64 `+/8=`, base64url `-_8`
      const data = Uint8Array.of(0xfb, 0xff)
      const { ID } = yield* service.create({ Name: "db", Data: Redacted.make(data) })
      assert.deepStrictEqual(Redacted.value(secrets.get(ID)!.Data!), data)
      const secret = yield* service.inspect(ID)
      assert.deepStrictEqual(Redacted.value(secret.Spec!.Data!), data)
      assert.notInclude(inspect(secret, { depth: 10 }), "251")
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
