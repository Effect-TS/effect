import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerSwarm, DockerSystem } from "effect/docker"
import { layer } from "./utils/dind.ts"

const Swarm = DockerSwarm.DockerSwarm

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerSwarm (live, dind)", (it) => {
  it.effect("fails with SwarmUnavailable outside a Swarm", () =>
    Effect.gen(function*() {
      const swarm = yield* Swarm
      assert.deepStrictEqual((yield* DockerSystem.DockerSystem.use((system) => system.ping)).swarm, {
        nodeState: "inactive",
        controlAvailable: false
      })
      for (const effect of [swarm.inspect, swarm.unlockKey, swarm.leave()]) {
        const error = yield* Effect.flip(effect)
        assert(error.reason._tag === "SwarmUnavailable", error.message)
      }
    }))

  it.effect("inits, updates, rotates tokens and the unlock key, and leaves", () =>
    Effect.gen(function*() {
      const swarm = yield* Swarm
      const system = yield* DockerSystem.DockerSystem
      const nodeId = yield* swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
      assert.isNotEmpty(nodeId)
      assert.deepStrictEqual((yield* system.ping).swarm, { nodeState: "active", controlAvailable: true })
      const again = yield* Effect.flip(swarm.init({ ListenAddr: "0.0.0.0:2377" }))
      assert.strictEqual(again.reason._tag, "SwarmUnavailable")

      const before = yield* swarm.inspect
      assert.match(Redacted.value(before.JoinTokens!.Worker!), /^SWMTKN-/)
      yield* swarm.update(
        { ...before.Spec, EncryptionConfig: { AutoLockManagers: true } },
        { version: before.Version!.Index!, rotateWorkerToken: true }
      )
      const after = yield* swarm.inspect
      assert.notStrictEqual(Redacted.value(after.JoinTokens!.Worker!), Redacted.value(before.JoinTokens!.Worker!))
      // the version is stale now
      const stale = yield* Effect.flip(swarm.update(after.Spec!, { version: before.Version!.Index! }))
      assert(stale.reason._tag === "ServerError")
      assert.include(stale.reason.message, "update out of sequence")

      const key = yield* swarm.unlockKey
      assert.match(Redacted.value(key!), /^SWMKEY-1-/)
      yield* swarm.update(after.Spec!, { version: after.Version!.Index!, rotateManagerUnlockKey: true })
      assert.notStrictEqual(Redacted.value((yield* swarm.unlockKey)!), Redacted.value(key!))
      const notLocked = yield* Effect.flip(swarm.unlock(key!))
      assert.strictEqual(notLocked.reason._tag, "Conflict")

      yield* swarm.leave({ force: true })
      assert.deepStrictEqual((yield* system.ping).swarm, { nodeState: "inactive", controlAvailable: false })
    }), 120_000)
})
