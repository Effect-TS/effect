import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerError, DockerTasks } from "effect/docker"
import { frame, json, makeStubEngine, withPing } from "./utils/stub.ts"

const Tasks = DockerTasks.DockerTasks

describe("DockerTasks", () => {
  it.effect("sends each request as the Engine reads it", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/logs")
          ? { headers: { "content-type": "application/vnd.docker.multiplexed-stream" }, body: frame(1, "out\n") }
          : request.url.pathname.endsWith("/tasks")
          ? json([{ ID: "t1" }])
          : json({ ID: "t1", Status: { State: "running" } })))
      const [list, task, logs] = yield* Tasks.use((tasks) =>
        Effect.all([
          tasks.list({ filters: { service: "web", "desired-state": "running" } }),
          tasks.inspect("t1"),
          Stream.runCollect(tasks.logs("t1", { timestamps: true }))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(list, [{ ID: "t1" }])
      assert.strictEqual(task.Status?.State, "running")
      assert.deepStrictEqual(logs.map((frame) => new TextDecoder().decode(frame.data)), ["out\n"])
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) =>
          `${request.method} ${request.url.pathname}${decodeURIComponent(request.url.search)}`
        ),
        [
          `GET /v1.44/tasks?filters={"service":["web"],"desired-state":["running"]}`,
          "GET /v1.44/tasks/t1",
          "GET /v1.44/tasks/t1/logs?stdout=true&stderr=true&timestamps=true"
        ]
      )
    }))

  it.effect("fails with SwarmUnavailable on a node that isn't a manager", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ message: "This node is not a swarm manager." }, 503)))
      const error = yield* Effect.flip(Tasks.use((tasks) => tasks.inspect("t1"))).pipe(stub.provide)
      assert.deepStrictEqual(
        error.reason,
        new DockerError.SwarmUnavailable({
          status: 503,
          message: "This node is not a swarm manager.",
          operation: "docker.Tasks.inspect"
        })
      )
    }))

  it.effect("fails logs with the Engine's error response", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ message: "task t1 not found" }, 404)))
      const error = yield* Effect.flip(Stream.runDrain(Stream.unwrap(Tasks.useSync((tasks) => tasks.logs("t1"))))).pipe(
        stub.provide
      )
      assert.deepStrictEqual(
        error.reason,
        new DockerError.NotFound({ status: 404, message: "task t1 not found", operation: "docker.Tasks.logs" })
      )
    }))
})
