import { assert, it } from "@effect/vitest"
import { Effect, Schedule, Stream } from "effect"
import { DockerServices, DockerSwarm } from "effect/docker"
import { layer } from "./utils/dind.ts"

const Services = DockerServices.DockerServices

/** Retries until `effect` succeeds, for state the Swarm reaches eventually. */
const eventually = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.retry(effect, { schedule: Schedule.spaced("500 millis"), times: 120 })

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerServices (live, dind)", (it) => {
  it.effect(
    "creates a pinned service, reads its logs, updates, rolls back and removes it",
    () =>
      Effect.gen(function*() {
        const services = yield* Services
        yield* DockerSwarm.DockerSwarm.use((swarm) =>
          swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
        )
        const { ID, Warnings } = yield* services.create({
          Name: "echo",
          Labels: { rev: "1" },
          TaskTemplate: {
            ContainerSpec: {
              Image: "docker.io/library/alpine:3.22",
              Command: ["sh", "-c", "while true; do echo out; sleep 1; done"]
            }
          },
          Mode: { Replicated: { Replicas: 1 } }
        }, { resolveImage: true })
        assert.deepStrictEqual(Warnings, [])
        const created = yield* services.inspect(ID!)
        assert.match(
          created.Spec?.TaskTemplate?.ContainerSpec?.Image ?? "",
          /^docker\.io\/library\/alpine:3\.22@sha256:/
        )
        assert.isNotEmpty(created.Spec?.TaskTemplate?.Placement?.Platforms ?? [])

        const line = yield* eventually(
          Stream.runHead(services.logs("echo", { details: true, stderr: false, tail: 1 })).pipe(
            Effect.flatMap((frame) => frame._tag === "Some" ? Effect.succeed(frame.value) : Effect.fail("no logs yet"))
          )
        )
        const parsed = DockerServices.parseLogLine(new TextDecoder().decode(line.data).trimEnd())
        assert.strictEqual(parsed.details["com.docker.swarm.service.id"], ID)
        assert.strictEqual(parsed.message, "out")

        const update = yield* services.update("echo", { ...created.Spec, Labels: { rev: "2" } }, {
          version: created.Version!.Index!
        })
        assert.deepStrictEqual(update.Warnings, [])
        const stale = yield* Effect.flip(services.update("echo", created.Spec!, { version: created.Version!.Index! }))
        assert(stale.reason._tag === "ServerError")
        assert.include(stale.reason.message, "update out of sequence")
        yield* services.rollback("echo")
        assert.deepStrictEqual((yield* services.inspect("echo")).Spec?.Labels, { rev: "1" })
        const listed = yield* services.list({ filters: { name: "echo" }, status: true })
        assert.deepStrictEqual(listed.map((service) => service.ID), [ID])

        yield* services.remove("echo")
        const missing = yield* Effect.flip(services.inspect("echo"))
        assert.strictEqual(missing.reason._tag, "NotFound")
      }),
    180_000
  )
})
