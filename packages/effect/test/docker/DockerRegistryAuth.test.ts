import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Redacted } from "effect"
import type { DockerConfig } from "effect/docker"
import { TestClock } from "effect/testing"
import { helpers, makeStubEngine } from "./utils/stub.ts"

const plain = (credential: DockerConfig.Credential | undefined) =>
  credential === undefined ? undefined : {
    username: credential.username,
    password: credential.password && Redacted.value(credential.password),
    identityToken: credential.identityToken && Redacted.value(credential.identityToken)
  }

describe("DockerRegistryAuth", () => {
  it.effect("looks registries up as the Docker CLI does: DOCKER_AUTH_CONFIG, then helpers, then auths", () =>
    Effect.gen(function*() {
      const spawner = helpers({
        test: (registry) =>
          registry === "ghcr.io"
            ? { stdout: JSON.stringify({ ServerURL: "ghcr.io", Username: "helper-user", Secret: "helper-secret" }) }
            : registry === "gcr.io"
            ? { stdout: JSON.stringify({ ServerURL: "gcr.io", Username: "<token>", Secret: "identity" }) }
            : { stdout: "credentials not found in native keychain\n", exitCode: 1 }
      })
      const { registryAuth } = makeStubEngine(() => ({}), {
        spawner,
        config: {
          authConfig: { "ghcr.io": { username: "env", password: Redacted.make("e") } },
          auths: {
            "docker.io": { username: "hub", password: Redacted.make("h") },
            "https://registry.example.com/v1/": { username: "legacy", password: Redacted.make("l") },
            "https://quay.io": {}
          },
          credHelpers: { "gcr.io": "test", "https://ghcr.io": "test", "unknown.example": "test" }
        }
      })
      const resolved = yield* Effect.forEach(
        ["ghcr.io", "gcr.io", "unknown.example", "index.docker.io", "registry.example.com", "quay.io", "other.io"],
        (registry) => Effect.map(registryAuth.credential(registry), plain)
      )
      assert.deepStrictEqual(resolved, [
        // DOCKER_AUTH_CONFIG first, before the registry's helper
        { username: "env", password: "e", identityToken: undefined },
        // a helper's `<token>` user is an identity token
        { username: undefined, password: undefined, identityToken: "identity" },
        // "credentials not found" is anonymous
        undefined,
        // `docker.io` and `index.docker.io` are the same registry
        { username: "hub", password: "h", identityToken: undefined },
        // the legacy `https://host/v1/` entries match by host
        { username: "legacy", password: "l", identityToken: undefined },
        // an entry without credentials is anonymous
        undefined,
        undefined
      ])
      // helpers are asked with the normalized registry, every time
      assert.deepStrictEqual(spawner.runs, [
        "docker-credential-test get: gcr.io",
        "docker-credential-test get: unknown.example"
      ])
    }))

  it.effect("fails with CredentialsUnavailable when a helper fails, is missing, or answers nonsense", () =>
    Effect.gen(function*() {
      const spawner = helpers({
        broken: () => ({ stderr: "keychain locked\n", exitCode: 3 }),
        loose: () => ({ stdout: "error: credentials not found in native keychain (and more)\n", exitCode: 1 }),
        garbled: () => ({ stdout: "not json" })
      })
      const failure = (credsStore: string) =>
        makeStubEngine(() => ({}), { spawner, config: { credsStore } }).registryAuth.credential("docker.io").pipe(
          Effect.flip,
          Effect.map((error) => error.reason)
        )
      const [broken, missing, loose, garbled] = yield* Effect.forEach(
        ["broken", "missing", "loose", "garbled"],
        failure
      )
      assert(broken._tag === "CredentialsUnavailable")
      assert.strictEqual(broken.registry, "https://index.docker.io/v1/")
      assert.strictEqual(broken.helper, "broken")
      assert.include(broken.message, "keychain locked")
      assert(missing._tag === "CredentialsUnavailable")
      assert.include(missing.message, "Failed to run docker-credential-missing")
      // only the protocol's exact answer means anonymous
      assert.strictEqual(loose._tag, "CredentialsUnavailable")
      assert(garbled._tag === "CredentialsUnavailable")
      assert.include(garbled.message, "malformed JSON")
    }))

  it.effect("fails with CredentialsUnavailable when a helper takes longer than a minute", () =>
    Effect.gen(function*() {
      const { registryAuth } = makeStubEngine(() => ({}), {
        spawner: helpers({ slow: () => ({ hang: true }) }),
        config: { credsStore: "slow" }
      })
      const fiber = yield* Effect.forkChild(Effect.flip(registryAuth.credential("ghcr.io")))
      yield* TestClock.adjust("1 minute")
      const error = yield* Fiber.join(fiber)
      assert(error.reason._tag === "CredentialsUnavailable")
      assert.include(error.reason.message, "took longer than a minute")
    }))
})
