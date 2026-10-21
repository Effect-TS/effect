import { assert, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerEngine, DockerSystem } from "effect/docker"
import { layer } from "./utils/live.ts"

it.layer(layer, { timeout: "120 seconds", excludeTestServices: true })("DockerSystem (live)", (it) => {
  it.effect("negotiates, and reports ping, version, info and disk usage", () =>
    Effect.gen(function*() {
      const engine = yield* DockerEngine.DockerEngine
      const system = yield* DockerSystem.DockerSystem
      const apiVersion = yield* engine.apiVersion
      const ping = yield* system.ping
      assert.isDefined(ping.apiVersion)
      // the lower of the Engine's version and the client's maximum
      assert.match(apiVersion, /^1\.\d+$/)
      const version = yield* system.version
      assert.strictEqual(version.ApiVersion, ping.apiVersion)
      const info = yield* system.info
      assert.isDefined(info.ServerVersion)
      assert.strictEqual(ping.swarm?.nodeState, info.Swarm?.LocalNodeState)
      assert.strictEqual(ping.swarm?.controlAvailable, info.Swarm?.ControlAvailable ?? false)
      assert.strictEqual(ping.experimental, info.ExperimentalBuild)
      const usage = yield* system.df({ type: ["volume"] })
      assert.isObject(usage)
    }), 60_000)

  it.effect("ends the event stream at until", () =>
    Effect.gen(function*() {
      const system = yield* DockerSystem.DockerSystem
      const events = yield* system.events({ since: 0, until: Date.now() + 1000 }).pipe(Stream.runCollect)
      for (const event of events) assert.isString(event.Type)
    }), 60_000)
})
