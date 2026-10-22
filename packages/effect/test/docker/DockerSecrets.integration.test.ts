import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerSecrets, DockerServices, DockerSwarm } from "effect/docker"
import { layer } from "./utils/dind.ts"

// padded standard base64 `+/8=`, which the Engine requires
const bytes = Uint8Array.of(0xfb, 0xff)

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerSecrets (live, dind)", (it) => {
  it.effect(
    "creates a secret, updates its labels only, and refuses to remove it while in use",
    () =>
      Effect.gen(function*() {
        const secrets = yield* DockerSecrets.DockerSecrets
        const services = yield* DockerServices.DockerServices
        yield* DockerSwarm.DockerSwarm.use((swarm) =>
          swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
        )
        const { ID } = yield* secrets.create({ Name: "db", Data: Redacted.make(bytes), Labels: { rev: "1" } })
        const secret = yield* secrets.inspect("db")
        assert.strictEqual(secret.ID, ID)
        // the Engine never returns the data
        assert.isUndefined(secret.Spec?.Data)
        yield* secrets.update("db", { ...secret.Spec, Labels: { rev: "2" } }, { version: secret.Version!.Index! })
        const updated = yield* secrets.inspect("db")
        assert.deepStrictEqual(updated.Spec?.Labels, { rev: "2" })
        const changed = yield* Effect.flip(
          secrets.update("db", { ...updated.Spec, Data: Redacted.make(Uint8Array.of(1)) }, {
            version: updated.Version!.Index!
          })
        )
        assert.strictEqual(changed.reason._tag, "BadRequest")

        const { ID: service } = yield* services.create({
          Name: "uses-db",
          TaskTemplate: {
            ContainerSpec: {
              Image: "docker.io/library/alpine:3.22",
              Command: ["sleep", "600"],
              Secrets: [{ SecretID: ID, SecretName: "db", File: { Name: "db", UID: "0", GID: "0", Mode: 0o400 } }]
            }
          }
        })
        const inUse = yield* Effect.flip(secrets.remove("db"))
        assert.strictEqual(inUse.reason._tag, "BadRequest")
        yield* services.remove(service!)
        yield* secrets.remove("db")
        assert.deepStrictEqual(yield* secrets.list({ filters: { name: "db" } }), [])
      }),
    180_000
  )
})
