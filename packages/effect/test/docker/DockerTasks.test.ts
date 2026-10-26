import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerApi, DockerError, DockerTasks } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"
import { concat, frame } from "./utils/stub.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("tasks").add(DockerApi.Tasks.endpoints.inspect, DockerApi.Tasks.endpoints.logs)
    .middleware(DockerApi.SwarmErrors)
)

const Handlers = HttpApiBuilder.group(Served, "tasks", (handlers) =>
  handlers
    .handle("inspect", ({ params }) =>
      params.id === "t1"
        ? Effect.succeed({ ID: "t1", Status: { State: "running" as const } })
        : Effect.fail(new DockerError.NotFound({ message: `task ${params.id} not found` })))
    .handle("logs", () =>
      Effect.succeed(HttpApiSchema.withHeaders({
        body: Stream.make(concat(frame(1, "out\n"), frame(2, "err\n"))),
        headers: { "content-type": "application/vnd.docker.multiplexed-stream" as const }
      }))))

describe("DockerTasks", () => {
  it.effect("round-trips DockerApi: inspect, error responses and multiplexed logs", () =>
    Effect.gen(function*() {
      const tasks = yield* DockerTasks.DockerTasks
      assert.strictEqual((yield* tasks.inspect("t1")).Status?.State, "running")
      const missing = yield* Effect.flip(tasks.inspect("t2"))
      assert.deepStrictEqual(
        [missing.reason, missing.operation],
        [new DockerError.NotFound({ message: "task t2 not found" }), "docker.Tasks.inspect"]
      )
      const frames = yield* Stream.runCollect(tasks.logs("t1"))
      assert.deepStrictEqual(
        frames.map((frame) => `${frame.stream}:${new TextDecoder().decode(frame.data)}`),
        ["stdout:out\n", "stderr:err\n"]
      )
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
