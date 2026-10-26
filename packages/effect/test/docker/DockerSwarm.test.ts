import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { DockerApi, DockerError, DockerSwarm } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup } from "effect/http-api"
import { inspect } from "node:util"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("swarm").add(
    DockerApi.Swarm.endpoints.inspect,
    DockerApi.Swarm.endpoints.update,
    DockerApi.Swarm.endpoints.unlockKey
  ).middleware(DockerApi.SwarmErrors)
)

let manager = true
const updates: Array<unknown> = []

const Handlers = HttpApiBuilder.group(Served, "swarm", (handlers) =>
  handlers
    .handle("inspect", () =>
      manager
        ? Effect.succeed({
          ID: "s",
          Version: { Index: 7 },
          Spec: { Name: "default" },
          JoinTokens: { Worker: Redacted.make("SWMTKN-1-worker"), Manager: Redacted.make("SWMTKN-1-manager") }
        })
        : Effect.fail(new DockerError.SwarmUnavailable({ message: "This node is not a swarm manager." })))
    .handle("update", ({ payload, query }) =>
      Effect.sync(() => {
        updates.push({ query, payload })
      }))
    .handle("unlockKey", () =>
      Effect.succeed({ UnlockKey: Redacted.make("SWMKEY-1-secret", { label: "docker-swarm-unlock-key" }) })))

describe("DockerSwarm", () => {
  it.effect("round-trips DockerApi: redacted secrets, modify at the inspected version, SwarmUnavailable", () =>
    Effect.gen(function*() {
      const swarm = yield* DockerSwarm.DockerSwarm
      const info = yield* swarm.inspect
      const key = yield* swarm.unlockKey
      assert.deepStrictEqual(
        [info.JoinTokens?.Worker, info.JoinTokens?.Manager, key].map((secret) => secret && Redacted.value(secret)),
        ["SWMTKN-1-worker", "SWMTKN-1-manager", "SWMKEY-1-secret"]
      )
      for (const text of [inspect(info, { depth: 10 }), JSON.stringify(info), String(key)]) {
        assert.notMatch(text, /SWMTKN|SWMKEY/)
      }
      yield* swarm.modify((spec) => ({ ...spec, Labels: { rev: "2" } }), { rotateWorkerToken: true })
      assert.deepStrictEqual(updates, [{
        query: { version: 7, rotateWorkerToken: true },
        payload: { Name: "default", Labels: { rev: "2" } }
      }])
      manager = false
      const error = yield* Effect.flip(swarm.inspect)
      assert.deepStrictEqual(
        [error.reason, error.isRetryable],
        [new DockerError.SwarmUnavailable({ message: "This node is not a swarm manager." }), false]
      )
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
