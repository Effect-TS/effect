import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { helpers, makeStubEngine } from "./utils/stub.ts"

describe("DockerRegistryAuth", () => {
  it.effect("prefers auth config over helpers, and helpers over stored credentials", () =>
    Effect.gen(function*() {
      const { registryAuth } = makeStubEngine(() => ({}), {
        spawner: helpers({ test: () => ({ stdout: JSON.stringify({ Username: "helper", Secret: "password" }) }) }),
        config: {
          authConfig: { "ghcr.io": { username: "env" } },
          credsStore: "test",
          auths: { "ghcr.io": { username: "stored" }, "quay.io": { username: "stored" } }
        }
      })
      assert.strictEqual((yield* registryAuth.credential("ghcr.io"))?.username, "env")
      const credential = yield* registryAuth.credential("quay.io")
      assert.strictEqual(credential?.username, "helper")
      assert.strictEqual(Redacted.value(credential!.password!), "password")
    }))

  it.effect("treats helper not-found as anonymous but reports helper failures", () =>
    Effect.gen(function*() {
      const spawner = helpers({
        absent: () => ({ stdout: "credentials not found in native keychain", exitCode: 1 }),
        locked: () => ({ stderr: "keychain locked", exitCode: 3 })
      })
      const resolve = (credsStore: string) =>
        makeStubEngine(() => ({}), { spawner, config: { credsStore } }).registryAuth.credential("ghcr.io")
      assert.isUndefined(yield* resolve("absent"))
      const error = yield* resolve("locked").pipe(Effect.flip)
      assert(error.reason._tag === "CredentialsUnavailable")
      assert.include(error.reason.message, "keychain locked")
    }))
})
