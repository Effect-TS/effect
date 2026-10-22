import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import {
  DockerContainers,
  DockerSecrets,
  DockerServices,
  DockerSwarm,
  DockerSwarmConfigs,
  DockerVolumes
} from "effect/docker"
import { inspect } from "node:util"
import { json, makeStubEngine, recordSpans, withPing } from "./utils/stub.ts"

const Swarm = DockerSwarm.DockerSwarm

const notAManager = {
  message:
    "This node is not a swarm manager. Use \"docker swarm init\" or \"docker swarm join\" to connect this node to " +
    "swarm and try again."
}

describe("DockerSwarm", () => {
  it.effect("sends each request as the Engine reads it", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/swarm/init")
          // the node ID as a JSON string, and a newline
          ? { headers: { "content-type": "application/json" }, body: "\"node-1\"\n" }
          : {}))
      const nodeId = yield* Swarm.use((swarm) =>
        Effect.gen(function*() {
          const nodeId = yield* swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "10.0.0.1" })
          yield* swarm.join({
            ListenAddr: "0.0.0.0:2377",
            RemoteAddrs: ["10.0.0.2:2377"],
            JoinToken: Redacted.make("t")
          })
          yield* swarm.leave({ force: true })
          yield* swarm.update({ Name: "default" }, {
            version: 7,
            rotateWorkerToken: true,
            rotateManagerUnlockKey: true
          })
          yield* swarm.unlock(Redacted.make("SWMKEY-1-k"))
          return nodeId
        })
      ).pipe(stub.provide)
      assert.strictEqual(nodeId, "node-1")
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          "POST /v1.44/swarm/init",
          "POST /v1.44/swarm/join",
          "POST /v1.44/swarm/leave?force=true",
          "POST /v1.44/swarm/update?version=7&rotateWorkerToken=true&rotateManagerUnlockKey=true",
          "POST /v1.44/swarm/unlock"
        ]
      )
      assert.deepStrictEqual(stub.requests.slice(1).map((request) => request.body && JSON.parse(request.body)), [
        { ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "10.0.0.1" },
        { ListenAddr: "0.0.0.0:2377", RemoteAddrs: ["10.0.0.2:2377"], JoinToken: "t" },
        undefined,
        { Name: "default" },
        { UnlockKey: "SWMKEY-1-k" }
      ])
    }))

  it.effect("redacts join tokens and the unlock key, and reads an empty unlock key as autolock off", () =>
    Effect.gen(function*() {
      let unlockKey = "SWMKEY-1-secret"
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/unlockkey")
          ? json({ UnlockKey: unlockKey })
          : json({
            ID: "s",
            Version: { Index: 11 },
            JoinTokens: { Worker: "SWMTKN-1-worker", Manager: "SWMTKN-1-manager" }
          })))
      const { attributes, tracer } = recordSpans()
      const [swarm, key, off] = yield* Swarm.use((swarm) =>
        Effect.all([
          swarm.inspect,
          swarm.unlockKey,
          Effect.suspend(() => {
            unlockKey = ""
            return swarm.unlockKey
          })
        ])
      ).pipe(stub.provide, Effect.withTracer(tracer))
      assert.strictEqual(swarm.Version?.Index, 11)
      assert.deepStrictEqual(
        [swarm.JoinTokens?.Worker, swarm.JoinTokens?.Manager, key].map((secret) => secret && Redacted.value(secret)),
        ["SWMTKN-1-worker", "SWMTKN-1-manager", "SWMKEY-1-secret"]
      )
      assert.isUndefined(off)
      const shown = [inspect(swarm, { depth: 10 }), String(key), JSON.stringify(swarm), attributes().join("\n")]
      for (const text of shown) assert.notMatch(text, /SWMTKN|SWMKEY/)
    }))

  it.effect("modify updates every Swarm object at the version it inspected", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.method === "GET"
          ? json({ ID: "x", Version: { Index: 7 }, Spec: { Name: "x" } })
          // only a service update answers with a body
          : request.url.pathname.startsWith("/v1.44/services/")
          ? json({ Warnings: null })
          : {}))
      const label = <S extends { readonly Labels?: Readonly<Record<string, string>> }>(spec: S): S => ({
        ...spec,
        Labels: { rev: "2" }
      })
      yield* Effect.all([
        Swarm.use((swarm) => swarm.modify(label, { rotateWorkerToken: true })),
        DockerServices.DockerServices.use((services) => services.modify("x", label)),
        DockerSecrets.DockerSecrets.use((secrets) => secrets.modify("x", label)),
        DockerSwarmConfigs.DockerSwarmConfigs.use((configs) => configs.modify("x", label))
      ]).pipe(stub.provide)
      const writes = stub.requests.filter((request) => request.method === "POST")
      assert.deepStrictEqual(
        writes.map((request) => [`${request.url.pathname}${request.url.search}`, JSON.parse(request.body!)]),
        [
          ["/v1.44/swarm/update?version=7&rotateWorkerToken=true", { Name: "x", Labels: { rev: "2" } }],
          ["/v1.44/services/x/update?version=7", { Name: "x", Labels: { rev: "2" } }],
          ["/v1.44/secrets/x/update?version=7", { Name: "x", Labels: { rev: "2" } }],
          ["/v1.44/configs/x/update?version=7", { Name: "x", Labels: { rev: "2" } }]
        ]
      )
    }))

  it.effect("fails a Swarm endpoint's 503 with SwarmUnavailable, which isn't retryable", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json(notAManager, 503)))
      const [swarm, volume, containers] = yield* Effect.all([
        Effect.flip(Swarm.use((swarm) => swarm.inspect)),
        Effect.flip(DockerVolumes.DockerVolumes.use((volumes) => volumes.update("v", {}, { version: 1 }))),
        Effect.flip(DockerContainers.DockerContainers.use((containers) => containers.list()))
      ]).pipe(stub.provide)
      assert(swarm.reason._tag === "SwarmUnavailable")
      assert.strictEqual(swarm.reason.message, notAManager.message)
      assert.isFalse(swarm.isRetryable)
      assert.strictEqual(volume.reason._tag, "SwarmUnavailable")
      // other endpoints keep the retryable Unavailable
      assert.strictEqual(containers.reason._tag, "Unavailable")
      assert.isTrue(containers.isRetryable)
    }))
})
