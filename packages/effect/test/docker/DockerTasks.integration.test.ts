import { assert, it } from "@effect/vitest"
import { Effect, Schedule, Stream } from "effect"
import { DockerServices, DockerSwarm, DockerTasks } from "effect/docker"
import { layer } from "./utils/dind.ts"

/** Retries until `effect` succeeds, for state the Swarm reaches eventually. */
const eventually = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.retry(effect, { schedule: Schedule.spaced("500 millis"), times: 120 })

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerTasks (live, dind)", (it) => {
  it.effect("lists, inspects and reads the logs of a service's task", () =>
    Effect.gen(function*() {
      const tasks = yield* DockerTasks.DockerTasks
      yield* DockerSwarm.DockerSwarm.use((swarm) =>
        swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
      )
      yield* DockerServices.DockerServices.use((services) =>
        services.create({
          Name: "ticker",
          TaskTemplate: {
            ContainerSpec: {
              Image: "docker.io/library/alpine:3.22",
              Command: ["sh", "-c", "while true; do echo tick; sleep 1; done"]
            }
          }
        })
      )
      const [task] = yield* eventually(
        tasks.list({ filters: { service: "ticker", "desired-state": "running" } }).pipe(
          Effect.filterOrFail((found) => found.some((task) => task.Status?.State === "running"))
        )
      )
      assert.strictEqual((yield* tasks.inspect(task.ID!)).ID, task.ID)
      const line = yield* eventually(
        Stream.runHead(tasks.logs(task.ID!, { details: true, tail: 1 })).pipe(
          Effect.flatMap((frame) => frame._tag === "Some" ? Effect.succeed(frame.value) : Effect.fail("no logs yet"))
        )
      )
      const parsed = DockerServices.parseLogLine(new TextDecoder().decode(line.data).trimEnd())
      assert.strictEqual(parsed.details["com.docker.swarm.task.id"], task.ID)
      assert.strictEqual(parsed.message, "tick")
      const missing = yield* Effect.flip(tasks.inspect("no-such-task"))
      assert.strictEqual(missing.reason._tag, "NotFound")
    }), 180_000)
})
